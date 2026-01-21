/**
 * Pickup Order Status Updater
 *
 * Automatically advances pickup order statuses based on elapsed time:
 * - accepted → in_kitchen (immediately so prep tracking starts)
 * - in_kitchen → ready (at 25 minutes from order placement)
 *
 * This function should be called every minute via Supabase Edge Functions cron
 * or triggered manually.
 */

import { createClient } from "npm:@supabase/supabase-js";
import { getUberDeliveryStatus } from "../market-server/uber.ts";
import { sendOrderStatusPushForOrder } from "../market-server/notifications.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

function nowIso(): string {
  return new Date().toISOString();
}

type DeliveryStatus =
  | "pending"
  | "pickup"
  | "pickup_complete"
  | "dropoff"
  | "delivered"
  | "canceled"
  | "returned";

const COURIER_STATUS_MAP: Record<DeliveryStatus, string> = {
  pending: "dispatching",
  pickup: "dispatching",
  pickup_complete: "en_route",
  dropoff: "en_route",
  delivered: "completed",
  canceled: "cancelled",
  returned: "cancelled",
};

const ORDER_STATUS_MAP: Record<DeliveryStatus, string> = {
  pending: "courier_requested",
  pickup: "driver_en_route",
  pickup_complete: "picked_up",
  dropoff: "picked_up",
  delivered: "delivered",
  canceled: "canceled",
  returned: "canceled",
};

const STATUS_TITLE_MAP: Record<DeliveryStatus, string> = {
  pending: "Courier Requested",
  pickup: "Courier En Route to Store",
  pickup_complete: "Courier Picked Up Order",
  dropoff: "Out for Delivery",
  delivered: "Delivered",
  canceled: "Delivery Canceled",
  returned: "Order Returned",
};

const STATUS_DETAIL_MAP: Record<DeliveryStatus, string> = {
  pending: "We're lining up a courier to deliver your order",
  pickup: "A courier is heading to the store",
  pickup_complete: "Your order was picked up and is heading out",
  dropoff: "Your order is on the way",
  delivered: "Your order has been delivered",
  canceled: "Your delivery was canceled",
  returned: "Your order has been returned to the store",
};

// Hard-coded prep SLA in minutes for both pickup and delivery handoff
const PREP_DURATION_MINUTES = 25;
const PREP_START_MINUTES = 0;

/**
 * Check and update orders that need status progression
 */
async function updatePickupOrderStatuses() {
  const now = new Date();
  console.log(`🔄 Running pickup status updater at ${now.toISOString()}`);

  try {
    // Find all active orders that might need status updates (include tenant config for merchant phone)
    const { data: orders, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, created_at, tenant_id, customer_id, order_number, contact_phone, contact_email, contact_name, fulfillment_type, tenants!inner(name, config)")
      .in("fulfillment_type", ["pickup", "delivery"])
      .in("status", ["accepted", "in_kitchen"])
      .order("created_at", { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error("❌ Error fetching pickup orders:", fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!orders || orders.length === 0) {
      console.log("✅ No orders need status updates");
      return { success: true, updated: 0 };
    }

    console.log(`📦 Found ${orders.length} orders to check for auto progression`);

    let updated = 0;

    for (const order of orders) {
      const createdAt = new Date(order.created_at);
      const minutesElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      let newStatus: string | null = null;
      let eventTitle = "";
      let eventDetail = "";

      const isPickup = order.fulfillment_type === "pickup";

      // accepted → in_kitchen (immediately begin prep)
      if (order.status === "accepted" && minutesElapsed >= PREP_START_MINUTES) {
        newStatus = "in_kitchen";
        eventTitle = "Preparing";
        eventDetail = "Your order is being prepared";
      }
      // in_kitchen → ready (after prep SLA)
      else if (order.status === "in_kitchen" && minutesElapsed >= PREP_DURATION_MINUTES) {
        newStatus = "ready";
        eventTitle = isPickup ? "Ready for Pickup" : "Ready for Courier";
        eventDetail = isPickup
          ? "Your order is ready for pickup!"
          : "Your order is ready for courier handoff";
      }

      if (newStatus) {
        console.log(`📦 Updating order #${order.order_number || order.id} (${order.fulfillment_type}): ${order.status} → ${newStatus} (${Math.round(minutesElapsed)}min elapsed)`);

        // Update order status
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            status: newStatus,
            updated_at: nowIso(),
          })
          .eq("id", order.id);

        if (updateError) {
          console.error(`❌ Failed to update order ${order.id}:`, updateError);
          continue;
        }

        // Create order event
        const { error: eventError } = await supabase
          .from("order_events")
          .insert({
            order_id: order.id,
            tenant_id: order.tenant_id,
            status: newStatus,
            title: eventTitle,
            detail: eventDetail,
            actor: "system",
          });

        if (eventError) {
          console.error(`❌ Failed to create event for order ${order.id}:`, eventError);
        }

        // NOTE: For delivery orders, Uber Direct is already notified of pickup time
        // when the delivery is created (pickup_ready_dt = now + prep_time).
        // Uber only allows ONE reschedule, so we don't update pickup_ready_dt here.
        // The courier should arrive around the scheduled pickup time.

        // Send SMS & Email notifications to customer, merchant, and platform
        if (isPickup && order.contact_phone && newStatus === "ready") {
          console.log(`📱 Sending pickup ready notifications (SMS + Email) to ${order.contact_phone}`);

          try {
            // Import notification function
            const { sendPickupReady } = await import("../market-server/twilio.ts");

            // Prioritize tenant config phone over env var for merchant notifications
            const tenantConfig = (order as any).tenants?.config;
            const merchantPhone = tenantConfig?.pickup?.phone || Deno.env.get("MERCHANT_PHONE_NUMBER") || "";
            const merchantName = (order as any).tenants?.name || "Shahirizada Fresh Market";

            await sendPickupReady({
              customerPhone: order.contact_phone,
              customerEmail: order.contact_email,
              customerName: order.contact_name || "Customer",
              merchantPhone,
              orderNumber: order.order_number?.toString() || order.id.slice(-6),
              merchantName,
            });

            await sendOrderStatusPushForOrder({
              orderId: order.id,
              orderNumber: order.order_number?.toString() || order.id.slice(-6),
              status: newStatus,
              fulfillmentType: order.fulfillment_type,
              customerId: order.customer_id ?? null,
            });
            console.log("✅ Pickup ready notifications sent");
          } catch (notifError: any) {
            console.error("⚠️ Failed to send pickup ready notifications:", notifError.message);
          }
        }

        updated++;
      }
    }

    console.log(`✅ Updated ${updated} orders to next prep stage`);
    const courierUpdated = await syncCourierStatuses(now);
    return { success: true, updated, courier_updated: courierUpdated };

  } catch (error: any) {
    console.error("❌ Error in pickup status updater:", error);
    return { success: false, error: error.message };
  }
}

async function syncCourierStatuses(now: Date): Promise<number> {
  const { data: tasks, error } = await supabase
    .from("courier_tasks")
    .select(`
      id,
      order_id,
      tenant_id,
      status,
      delivery_id,
      tracking_url,
      raw_status,
      last_status_at,
      live_mode,
      orders!inner(
        id,
        status,
        tenant_id,
        order_number,
        contact_phone,
        contact_email,
        contact_name,
        fulfillment_type,
        metadata
      )
    `)
    .not("delivery_id", "is", null)
    .in("status", ["dispatching", "en_route"])
    .order("requested_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("❌ Error fetching courier tasks:", error);
    return 0;
  }

  if (!tasks || tasks.length === 0) {
    console.log("✅ No courier tasks need polling updates");
    return 0;
  }

  let updated = 0;

  for (const task of tasks) {
    if (!task.delivery_id) continue;

    const lastStatusAt = task.last_status_at ? new Date(task.last_status_at) : null;
    if (lastStatusAt && now.getTime() - lastStatusAt.getTime() < 60_000) {
      continue;
    }

    // Determine Uber mode based on order metadata environment first, then fall back to live_mode
    // This ensures we use the correct API even if Uber's live_mode response was wrong
    const order = (task as any).orders;
    const orderEnv = order?.metadata?.deliveryEnvironment || order?.metadata?.environment;
    // Priority: order metadata environment > courier_tasks.live_mode
    // "test" → sandbox API, "prod"/"production" → production API
    let uberMode: "test" | "prod" = "prod";
    if (orderEnv === "test") {
      uberMode = "test";
    } else if (orderEnv === "prod" || orderEnv === "production") {
      uberMode = "prod";
    } else {
      // Fall back to live_mode if order metadata doesn't specify environment
      uberMode = task.live_mode === false ? "test" : "prod";
    }

    try {
      const delivery = await getUberDeliveryStatus(task.delivery_id, uberMode);
      const isComplete = delivery.raw?.complete === true;
      console.log(`🔍 Polled Uber (${uberMode}) for delivery ${task.delivery_id}: status=${delivery.status}, complete=${isComplete}`);

      // When Uber marks delivery as complete, treat as "delivered" regardless of status string
      // Uber sometimes leaves status as "dropoff" even when complete=true
      const uberStatus = isComplete ? "delivered" : (delivery.status ?? "pending") as DeliveryStatus;
      const courierStatus = isComplete ? "completed" : COURIER_STATUS_MAP[uberStatus];
      const orderStatus = isComplete ? "delivered" : ORDER_STATUS_MAP[uberStatus];
      const timestamp = nowIso();

      const courierUpdates: Record<string, any> = {
        raw_status: delivery.raw,
        tracking_url: delivery.trackingUrl ?? task.tracking_url,
        last_status_at: timestamp,
        updated_at: timestamp,
      };

      if (courierStatus && courierStatus !== task.status) {
        courierUpdates.status = courierStatus as any;
      }

      const { error: courierUpdateError } = await supabase
        .from("courier_tasks")
        .update(courierUpdates)
        .eq("id", task.id);

      if (courierUpdateError) {
        console.error(`❌ Failed to update courier task ${task.id}:`, courierUpdateError);
      }

      if (order && orderStatus && order.status !== orderStatus) {
        const { error: orderUpdateError } = await supabase
          .from("orders")
          .update({
            status: orderStatus as any,
            updated_at: timestamp,
          })
          .eq("id", order.id);

        if (orderUpdateError) {
          console.error(`❌ Failed to update order ${order.id}:`, orderUpdateError);
        } else {
          updated++;
          const title = STATUS_TITLE_MAP[uberStatus] ?? "Order Updated";
          const detail = STATUS_DETAIL_MAP[uberStatus] ?? "Your order status has been updated";

          await supabase.from("order_events").insert({
            order_id: order.id,
            tenant_id: order.tenant_id,
            status: orderStatus as any,
            title,
            detail,
            actor: "system",
            metadata: {
              delivery_id: task.delivery_id,
              tracking_url: delivery.trackingUrl,
              courier_status: delivery.status,
            },
          });
        }
      }
    } catch (pollError: any) {
      console.error(`⚠️ Failed to poll Uber for courier task ${task.id}:`, pollError.message);
    }
  }

  console.log(`🚚 Synced ${updated} courier-driven order updates via polling`);
  return updated;
}

// Main handler
Deno.serve(async (req) => {
  console.log("🔄 Pickup status updater invoked");

  // Allow both GET and POST
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const result = await updatePickupOrderStatuses();

    return new Response(
      JSON.stringify({
        success: result.success,
        updated: result.updated || 0,
        error: result.error || null,
        timestamp: nowIso(),
      }),
      {
        status: result.success ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Handler error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: nowIso(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
