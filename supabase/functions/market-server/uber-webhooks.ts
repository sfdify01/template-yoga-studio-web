import { createHmac } from "node:crypto";
import { createClient } from "npm:@supabase/supabase-js";
import { nowIso } from "./utils.ts";
import { sendStatusUpdate } from "./twilio.ts";
import { sendOrderStatusPushForOrder, updateLiveActivity, isOneSignalConfigured } from "./notifications.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// Uber Direct webhook event types
type UberWebhookEvent =
  | "event.delivery_status"
  | "event.courier_update"
  | "event.refund";

type DeliveryStatus =
  | "pending"
  | "pickup"
  | "pickup_complete"
  | "dropoff"
  | "delivered"
  | "canceled"
  | "returned";

// Uber cancellation reasons that indicate COURIER cancelled (not full order cancellation)
// When these occur, Uber automatically tries to find a replacement courier
const COURIER_CANCELLATION_REASONS = [
  "COURIER_CANCEL",           // Courier cancelled the delivery
  "COURIER_CANCEL_OTHER",     // Courier cancelled for other reason
  "COURIER_UNAVAILABLE",      // Courier became unavailable
  "COURIER_SAFETY",           // Safety concern
  "COURIER_VEHICLE_ISSUE",    // Vehicle problem
  "COURIER_EMERGENCY",        // Personal emergency
];

// Order status priority (higher = more advanced in delivery lifecycle)
const STATUS_PRIORITY: Record<string, number> = {
  created: 0,
  accepted: 1,
  in_kitchen: 2,
  ready: 3,
  courier_requested: 4,
  driver_en_route: 5,
  picked_up: 6,
  delivered: 7,
  canceled: 8,
};

interface UberDeliveryStatusWebhook {
  kind: "event.delivery_status";
  delivery_id: string;
  status: DeliveryStatus;
  data: {
    id: string;
    status: DeliveryStatus;
    complete?: boolean;
    tracking_url?: string;
    courier_imminent?: boolean;
    courier?: {
      name?: string;
      phone_number?: string;
      location?: {
        lat: number;
        lng: number;
      };
      img_href?: string;
      rating?: string;
      vehicle_type?: string;
      vehicle_make?: string;
      vehicle_model?: string;
      vehicle_color?: string;
    };
    pickup?: {
      status?: string;
      status_timestamp?: string;
    };
    dropoff?: {
      status?: string;
      status_timestamp?: string;
    };
    pickup_eta?: string;
    dropoff_eta?: string;
    external_id?: string;
    undeliverable_reason?: string;
    // Cancellation can have primary and secondary reasons
    cancellation_reason?: string;
    secondary_cancellation_reason?: string;
    batch_id?: string;
  };
}

interface UberCourierUpdateWebhook {
  kind: "event.courier_update";
  delivery_id: string;
  data: {
    id: string;
    courier: {
      name: string;
      phone_number: string;
      location: {
        lat: number;
        lng: number;
      };
      img_href?: string;
    };
  };
}

interface UberRefundWebhook {
  kind: "event.refund";
  delivery_id: string;
  data: {
    id: string;
    refund: {
      amount: number;
      currency: string;
      reason: string;
    };
  };
}

type UberWebhook = UberDeliveryStatusWebhook | UberCourierUpdateWebhook | UberRefundWebhook;

/**
 * Verify Uber Direct webhook signature using HMAC SHA-256
 * @param payload Raw request body as string
 * @param signature The x-uber-signature or x-postmates-signature header value
 * @param signingKey The webhook signing key from Uber Direct dashboard
 */
export function verifyUberSignature(
  payload: string,
  signature: string,
  signingKey: string
): boolean {
  const hmac = createHmac("sha256", signingKey);
  hmac.update(payload);
  const computedSignature = hmac.digest("hex");
  return computedSignature === signature;
}

/**
 * Map Uber delivery status to our internal order status
 */
export function mapUberStatusToOrderStatus(uberStatus: DeliveryStatus): string {
  const statusMap: Record<DeliveryStatus, string> = {
    pending: "courier_requested",
    pickup: "driver_en_route",
    pickup_complete: "picked_up",
    dropoff: "picked_up",
    delivered: "delivered",
    canceled: "canceled",
    returned: "canceled",
  };
  return statusMap[uberStatus] || "courier_requested";
}

/**
 * Handle Uber Direct delivery status webhook
 */
export function mapUberToCourierStatus(uberStatus: DeliveryStatus): string {
  const statusMap: Record<DeliveryStatus, string> = {
    pending: "dispatching",
    pickup: "dispatching",
    pickup_complete: "en_route",
    dropoff: "en_route",
    delivered: "completed",
    canceled: "cancelled",
    returned: "cancelled",
  };
  return statusMap[uberStatus] || "dispatching";
}

/**
 * Check if a cancellation reason indicates courier cancelled (not full order cancellation)
 */
export function isCourierOnlyCancellation(cancellationReason?: string): boolean {
  if (!cancellationReason) return false;
  return COURIER_CANCELLATION_REASONS.includes(cancellationReason);
}

export async function handleDeliveryStatusWebhook(
  webhook: UberDeliveryStatusWebhook
): Promise<void> {
  console.log("📦 Uber delivery status webhook received:", {
    deliveryId: webhook.delivery_id,
    status: webhook.status,
    externalId: webhook.data.external_id,
    pickupStatus: webhook.data.pickup?.status,
    dropoffStatus: webhook.data.dropoff?.status,
    courierName: webhook.data.courier?.name,
    courierImminent: webhook.data.courier_imminent,
    cancellationReason: webhook.data.cancellation_reason,
    trackingUrl: webhook.data.tracking_url,
  });

  const deliveryId = webhook.delivery_id;
  const orderStatus = mapUberStatusToOrderStatus(webhook.status);

  console.log(`📦 Uber status "${webhook.status}" mapped to order status "${orderStatus}"`);

  // Find courier task by delivery_id - need to fetch order data including contact phone, email, customer name, and order number
  const { data: courierTask } = await supabase
    .from("courier_tasks")
    .select(`
      *,
      orders!inner(
        id,
        status,
        customer_id,
        contact_phone,
        contact_email,
        contact_name,
        fulfillment_type,
        order_number,
        tenant_id
      ),
      tenants!inner(
        name,
        config
      )
    `)
    .eq("delivery_id", deliveryId)
    .maybeSingle();

  if (!courierTask) {
    console.error("❌ Courier task not found for delivery:", {
      deliveryId,
      status: webhook.status,
      externalId: webhook.data.external_id,
    });
    console.error("❌ This usually means:");
    console.error("   1. The delivery was created outside this system");
    console.error("   2. The courier_tasks table insert failed during order creation");
    console.error("   3. The delivery_id doesn't match what was stored");
    return;
  }

  const orderId = courierTask.order_id;
  const order = courierTask.orders as any;
  const customerPhone = order?.contact_phone;
  const customerName = order?.contact_name;
  const orderNumber = order?.order_number?.toString() || order?.id?.slice(-6);
  const businessName = (courierTask as any).tenants?.name;
  const currentOrderStatus = order?.status;

  // Check if this is a COURIER cancellation (not full order cancellation)
  // When courier cancels, Uber automatically tries to find replacement - we should NOT cancel the order
  const isCourierCancellation = webhook.status === "canceled" &&
    webhook.data.cancellation_reason &&
    COURIER_CANCELLATION_REASONS.includes(webhook.data.cancellation_reason);

  // Store previous courier info if courier changed
  const previousCourier = courierTask.raw_status?.courier;
  const newCourier = webhook.data.courier;
  const courierChanged = previousCourier?.name && newCourier?.name && previousCourier.name !== newCourier.name;

  // Update courier task status
  const courierStatus = isCourierCancellation ? "reassigning" : mapUberToCourierStatus(webhook.status);

  // Build courier history if courier changed
  let courierHistory = courierTask.raw_status?.courier_history || [];
  if (courierChanged && previousCourier) {
    courierHistory = [...courierHistory, {
      ...previousCourier,
      ended_at: nowIso(),
      reason: "reassigned",
    }];
    console.log(`🔄 Courier changed: ${previousCourier.name} → ${newCourier?.name}`);
  }

  const { error: courierUpdateError } = await supabase
    .from("courier_tasks")
    .update({
      status: courierStatus as any,
      raw_status: {
        ...webhook.data,
        courier_history: courierHistory,
        last_cancellation_reason: isCourierCancellation ? webhook.data.cancellation_reason : undefined,
      },
      tracking_url: webhook.data.tracking_url,
      last_status_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", courierTask.id);

  if (courierUpdateError) {
    console.error("❌ Failed to update courier task:", courierUpdateError);
    throw new Error(`Failed to update courier task: ${courierUpdateError.message}`);
  }

  console.log(`✅ Courier task updated: ${courierTask.status} → ${courierStatus}`);

  // GUARD 1: If this is a COURIER-ONLY cancellation, DON'T cancel the order
  // Uber will automatically find a replacement courier
  if (isCourierCancellation) {
    console.log(`🔄 Courier cancelled (reason: ${webhook.data.cancellation_reason}) - NOT cancelling order, waiting for replacement`);

    // Create event to track courier cancellation (but don't change order status)
    await supabase.from("order_events").insert({
      order_id: orderId,
      tenant_id: courierTask.tenant_id,
      status: currentOrderStatus as any, // Keep current order status
      title: "Courier Reassignment",
      detail: `Previous courier cancelled. Finding a new courier for your delivery.`,
      actor: "system",
      metadata: {
        uber_status: webhook.status,
        cancellation_reason: webhook.data.cancellation_reason,
        previous_courier: previousCourier?.name,
        delivery_id: deliveryId,
        note: "Order status unchanged - waiting for replacement courier",
      },
    });

    console.log("✅ Courier cancellation event recorded (order NOT cancelled)");
    return; // Exit early - don't update order status
  }

  // GUARD 2: If Uber says "pending" (courier_requested) but order hasn't reached "ready" yet,
  // only update courier_tasks, NOT the order status. This prevents skipping preparation stages.
  const PRE_READY_STATUSES = ["created", "accepted", "in_kitchen"];
  if (orderStatus === "courier_requested" && PRE_READY_STATUSES.includes(currentOrderStatus)) {
    console.log(`⚠️ Uber status "${webhook.status}" but order ${orderId} still in "${currentOrderStatus}" - updating courier_tasks only`);

    // Create order_event for tracking that courier was dispatched (but don't change order status)
    await supabase.from("order_events").insert({
      order_id: orderId,
      tenant_id: courierTask.tenant_id,
      status: currentOrderStatus as any, // Keep current order status
      title: "Courier Dispatched",
      detail: "A courier has been assigned and will pick up your order when ready",
      actor: "system",
      metadata: {
        uber_status: webhook.status,
        delivery_id: deliveryId,
        tracking_url: webhook.data.tracking_url,
        note: "Order status not updated - still in preparation",
      },
    });

    console.log("✅ Courier dispatch event recorded (order status unchanged)");
    return; // Exit early - don't update order status
  }

  // GUARD 3: Prevent BACKWARDS status transitions
  // Example: If order is already "picked_up", don't set it back to "driver_en_route"
  // This can happen when Uber sends "pending" after courier reassignment
  const currentPriority = STATUS_PRIORITY[currentOrderStatus] ?? 0;
  const newPriority = STATUS_PRIORITY[orderStatus] ?? 0;

  if (newPriority < currentPriority && orderStatus !== "canceled") {
    console.log(`⚠️ Preventing backwards transition: "${currentOrderStatus}" (${currentPriority}) → "${orderStatus}" (${newPriority})`);

    // Create event to track this (but don't change order status)
    await supabase.from("order_events").insert({
      order_id: orderId,
      tenant_id: courierTask.tenant_id,
      status: currentOrderStatus as any, // Keep current order status
      title: courierChanged ? "New Courier Assigned" : "Delivery Update",
      detail: courierChanged
        ? `${webhook.data.courier?.name || "A new courier"} has been assigned to your delivery`
        : `Delivery status updated (${webhook.status})`,
      actor: "system",
      metadata: {
        uber_status: webhook.status,
        delivery_id: deliveryId,
        tracking_url: webhook.data.tracking_url,
        courier_name: webhook.data.courier?.name,
        note: `Backwards transition prevented: ${currentOrderStatus} → ${orderStatus}`,
      },
    });

    console.log("✅ Event recorded (order status unchanged due to backwards transition prevention)");
    return; // Exit early - don't regress order status
  }

  // Update order status
  const { error: orderUpdateError } = await supabase
    .from("orders")
    .update({
      status: orderStatus as any,
      updated_at: nowIso(),
    })
    .eq("id", orderId);

  if (orderUpdateError) {
    console.error("❌ Failed to update order status:", orderUpdateError);
    throw new Error(`Failed to update order status: ${orderUpdateError.message}`);
  }

  console.log(`✅ Order status updated: ${currentOrderStatus} → ${orderStatus}`);

  // Create order event
  const eventTitle = getUberEventTitle(webhook.status);
  const eventDetail = getUberEventDetail(webhook.status, webhook.data.courier?.name);

  await supabase.from("order_events").insert({
    order_id: orderId,
    tenant_id: courierTask.tenant_id,
    status: orderStatus as any,
    title: eventTitle,
    detail: eventDetail,
    actor: "system",
    metadata: {
      uber_status: webhook.status,
      delivery_id: deliveryId,
      tracking_url: webhook.data.tracking_url,
    },
  });

  // Send SMS & Email notifications to customer, merchant, and platform for important status updates
  // Only send for: pending, pickup, pickup_complete, dropoff, delivered, canceled, returned
  const shouldNotifyCustomer = ["pending", "pickup", "pickup_complete", "dropoff", "delivered", "canceled", "returned"].includes(webhook.status);

  if (shouldNotifyCustomer && customerPhone) {
    console.log("📲 Sending status update notifications (SMS + Email):", {
      phone: customerPhone,
      status: webhook.status,
    });

    try {
      // Prioritize tenant config phone over env var for merchant notifications
      const tenantConfig = (courierTask as any).tenants?.config;
      const merchantPhone = tenantConfig?.pickup?.phone || Deno.env.get("MERCHANT_PHONE_NUMBER") || "";

      await sendStatusUpdate({
        customerPhone,
        customerEmail: order?.contact_email,
        customerName: customerName || "Customer",
        merchantPhone,
        orderNumber: orderNumber || "N/A",
        status: orderStatus,
        statusTitle: eventTitle,
        statusDetail: eventDetail,
        merchantName: businessName || "Shahirizada Fresh Market",
        courierName: webhook.data.courier?.name,
        trackingUrl: webhook.data.tracking_url,
      });
      await sendOrderStatusPushForOrder({
        orderId,
        orderNumber,
        status: orderStatus,
        fulfillmentType: order?.fulfillment_type ?? "delivery",
        customerId: order?.customer_id ?? null,
      });

      // Update iOS Live Activity widget (lock screen + Dynamic Island)
      if (isOneSignalConfigured()) {
        try {
          await updateLiveActivity({
            activityId: orderId,
            orderId: orderId,
            status: orderStatus,
            fulfillment: order?.fulfillment_type === "delivery" ? "delivery" : "pickup",
            eta: webhook.data.dropoff_eta || order?.delivery_eta || undefined,
            courierName: webhook.data.courier?.name,
          });
        } catch (liveActivityError: any) {
          console.warn("⚠️ Live Activity update failed:", liveActivityError.message);
        }
      }

      console.log("✅ Status update notifications sent");
    } catch (error: any) {
      console.error("⚠️ Failed to send status update notifications:", error.message);
      // Don't fail the webhook if notifications fail - just log the error
    }
  }

  console.log("✅ Order updated:", {
    orderId,
    orderNumber,
    oldStatus: order?.status,
    newStatus: orderStatus,
    notificationsSent: shouldNotifyCustomer && !!customerPhone,
  });
}

/**
 * Handle Uber Direct courier update webhook (location updates)
 */
export async function handleCourierUpdateWebhook(
  webhook: UberCourierUpdateWebhook
): Promise<void> {
  console.log("📍 Uber courier update webhook:", {
    deliveryId: webhook.delivery_id,
    location: webhook.data.courier.location,
  });

  const deliveryId = webhook.delivery_id;

  // Update courier task with latest location
  const { data: courierTask } = await supabase
    .from("courier_tasks")
    .select("id, raw_status")
    .eq("delivery_id", deliveryId)
    .maybeSingle();

  if (!courierTask) {
    console.warn("⚠️ Courier task not found for delivery:", deliveryId);
    return;
  }

  // Merge courier update into existing raw_status
  const updatedRawStatus = {
    ...(courierTask.raw_status || {}),
    courier: webhook.data.courier,
    last_location_update: nowIso(),
  };

  await supabase
    .from("courier_tasks")
    .update({
      raw_status: updatedRawStatus,
      updated_at: nowIso(),
    })
    .eq("id", courierTask.id);

  console.log("✅ Courier location updated");
}

/**
 * Handle Uber Direct refund webhook
 */
export async function handleRefundWebhook(
  webhook: UberRefundWebhook
): Promise<void> {
  console.log("💰 Uber refund webhook:", {
    deliveryId: webhook.delivery_id,
    amount: webhook.data.refund.amount,
    reason: webhook.data.refund.reason,
  });

  const deliveryId = webhook.delivery_id;

  // Find courier task and order
  const { data: courierTask } = await supabase
    .from("courier_tasks")
    .select("*, orders!inner(*)")
    .eq("delivery_id", deliveryId)
    .maybeSingle();

  if (!courierTask) {
    console.warn("⚠️ Courier task not found for delivery:", deliveryId);
    return;
  }

  // Create refund event
  await supabase.from("order_events").insert({
    order_id: courierTask.order_id,
    tenant_id: courierTask.tenant_id,
    status: "canceled" as any,
    title: "Delivery refunded",
    detail: `Refund issued: $${(webhook.data.refund.amount / 100).toFixed(2)}. Reason: ${webhook.data.refund.reason}`,
    actor: "system",
    metadata: {
      refund: webhook.data.refund,
      delivery_id: deliveryId,
    },
  });

  console.log("✅ Refund recorded");
}

/**
 * Main webhook handler - routes to appropriate handler based on event type
 */
export async function handleUberWebhook(
  webhook: UberWebhook,
  signature: string,
  rawBody: string
): Promise<{ success: boolean; error?: string }> {
  // Verify signature
  const signingKey = Deno.env.get("UBER_WEBHOOK_SIGNING_KEY");

  if (!signingKey) {
    console.warn("⚠️ UBER_WEBHOOK_SIGNING_KEY not configured - skipping signature verification");
  } else {
    const isValid = verifyUberSignature(rawBody, signature, signingKey);
    if (!isValid) {
      console.error("❌ Invalid Uber webhook signature");
      return { success: false, error: "Invalid signature" };
    }
  }

  try {
    switch (webhook.kind) {
      case "event.delivery_status":
        await handleDeliveryStatusWebhook(webhook as UberDeliveryStatusWebhook);
        break;

      case "event.courier_update":
        await handleCourierUpdateWebhook(webhook as UberCourierUpdateWebhook);
        break;

      case "event.refund":
        await handleRefundWebhook(webhook as UberRefundWebhook);
        break;

      default:
        console.warn("⚠️ Unknown Uber webhook event type:", (webhook as any).kind);
    }

    return { success: true };
  } catch (error: any) {
    console.error("❌ Error processing Uber webhook:", error);
    return { success: false, error: error.message };
  }
}

// Helper functions
export function getUberEventTitle(status: DeliveryStatus): string {
  const titles: Record<DeliveryStatus, string> = {
    pending: "Courier Requested",
    pickup: "Courier En Route to Store",
    pickup_complete: "Courier Picked Up Order",
    dropoff: "Out for Delivery",
    delivered: "Delivered",
    canceled: "Delivery Canceled",
    returned: "Order Returned",
  };
  return titles[status] || "Order Updated";
}

export function getUberEventDetail(status: DeliveryStatus, courierName?: string): string {
  const courier = courierName ? ` by ${courierName}` : "";

  const details: Record<DeliveryStatus, string> = {
    pending: "We're lining up a courier to deliver your order",
    pickup: `A courier${courier} is heading to the store`,
    pickup_complete: `Your order was picked up${courier} and is heading out`,
    dropoff: `Your order is on the way${courier}`,
    delivered: "Your order has been delivered",
    canceled: "Your delivery was canceled",
    returned: "Your order has been returned to the store",
  };
  return details[status] || "Your order status has been updated";
}
