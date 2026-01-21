import Stripe from "npm:stripe@15.11.0";
import { sendStatusUpdate, sendEmail } from "./twilio.ts";
import { sendOrderStatusPushForOrder } from "./notifications.ts";

/**
 * Stripe Platform Webhooks Handler (Your Account)
 *
 * Handles webhook events for platform-level payment events:
 * - Payment lifecycle (payment_intent.*)
 * - Charge events (charge.*)
 *
 * Updates Supabase database AND sends SMS/Email notifications via Twilio.
 *
 * IMPORTANT: This endpoint must be registered in your Stripe Dashboard:
 * https://dashboard.stripe.com/webhooks
 * Select "Your account" as the event source.
 *
 * Configure these events:
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - payment_intent.canceled
 * - charge.refunded
 * - charge.dispute.created
 *
 * NOTE: Handlers support both SNAPSHOT (full object) and THIN (ID only) payloads.
 * If Stripe sends a thin payload, we fetch the full object via API.
 */

type WebhookPayload = {
  id: string;
  object: "event";
  type: string;
  data: {
    object: any;
    previous_attributes?: Record<string, any>;
  };
  account?: string; // Present for Connect webhooks
  created: number;
  livemode: boolean;
};

/**
 * Check if the webhook payload is a thin payload (only ID) vs full snapshot
 */
function isThinPayload(obj: any): boolean {
  // Thin payloads typically only have 'id' and 'object' fields
  const keys = Object.keys(obj || {});
  return keys.length <= 3 && keys.includes("id") && !keys.includes("amount") && !keys.includes("status");
}

/**
 * Ensure we have a full PaymentIntent object (fetch if thin payload)
 */
async function ensurePaymentIntent(obj: any, stripe: Stripe): Promise<Stripe.PaymentIntent> {
  if (isThinPayload(obj) && obj.id) {
    console.log(`[Webhook] Thin payload detected, fetching full PaymentIntent: ${obj.id}`);
    return await stripe.paymentIntents.retrieve(obj.id);
  }
  return obj as Stripe.PaymentIntent;
}

/**
 * Ensure we have a full Charge object (fetch if thin payload)
 */
async function ensureCharge(obj: any, stripe: Stripe): Promise<Stripe.Charge> {
  if (isThinPayload(obj) && obj.id) {
    console.log(`[Webhook] Thin payload detected, fetching full Charge: ${obj.id}`);
    return await stripe.charges.retrieve(obj.id);
  }
  return obj as Stripe.Charge;
}

/**
 * Ensure we have a full Dispute object (fetch if thin payload)
 */
async function ensureDispute(obj: any, stripe: Stripe): Promise<Stripe.Dispute> {
  if (isThinPayload(obj) && obj.id) {
    console.log(`[Webhook] Thin payload detected, fetching full Dispute: ${obj.id}`);
    return await stripe.disputes.retrieve(obj.id);
  }
  return obj as Stripe.Dispute;
}

export async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
  stripe: Stripe,
): Promise<WebhookPayload> {
  try {
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, secret);
    return event as WebhookPayload;
  } catch (err: any) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }
}

export type WebhookHandler = (event: WebhookPayload, supabase: any, stripe: Stripe) => Promise<void>;

/**
 * Handle payment_intent.succeeded - Payment completed successfully
 */
export const handlePaymentIntentSucceeded: WebhookHandler = async (event, supabase, stripe) => {
  // Handle both thin and snapshot payloads
  const paymentIntent = await ensurePaymentIntent(event.data.object, stripe);

  console.log(`[Webhook] Payment succeeded: ${paymentIntent.id}`);

  // Update payment_intents table
  const { error: updateError } = await supabase
    .from("payment_intents")
    .update({
      status: paymentIntent.status,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", paymentIntent.id);

  if (updateError) {
    console.error("Failed to update payment_intents:", updateError);
    throw new Error("Database update failed");
  }

  // Find associated order and update payment status
  const { data: paymentRecord } = await supabase
    .from("payment_intents")
    .select("id, metadata")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .maybeSingle();

  if (paymentRecord?.metadata?.order_id) {
    // Get full order details with tenant info
    const { data: order } = await supabase
      .from("orders")
      .select("*, tenants!inner(name, slug, config)")
      .eq("id", paymentRecord.metadata.order_id)
      .maybeSingle();

    const { error: orderError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentRecord.metadata.order_id);

    if (orderError) {
      console.error("Failed to update order:", orderError);
    } else {
      // Add order event
      await supabase.from("order_events").insert({
        order_id: paymentRecord.metadata.order_id,
        tenant_id: paymentIntent.metadata?.tenant_id,
        status: "accepted",
        title: "Payment confirmed",
        detail: `Payment of $${(paymentIntent.amount / 100).toFixed(2)} received`,
        actor: "stripe",
      });

      // Send payment confirmation notifications
      if (order) {
        // Prioritize tenant config phone over env var for merchant notifications
        const merchantPhone = (order.tenants as any)?.config?.pickup?.phone || Deno.env.get("MERCHANT_PHONE_NUMBER") || "";
        const customerPhone = order.contact_phone || "";
        const customerEmail = order.contact_email || undefined;
        const customerName = order.contact_name || "Customer";
        const orderNumber = order.order_number?.toString() || order.short_code || order.id.slice(-6);
        const merchantName = order.tenants?.name || "Shahirizada Fresh Market";

        try {
          await sendStatusUpdate({
            customerPhone,
            customerEmail,
            customerName,
            merchantPhone,
            orderNumber,
            status: "accepted",
            statusTitle: "Payment confirmed",
            statusDetail: `Your payment of $${(paymentIntent.amount / 100).toFixed(2)} has been received. We're preparing your order!`,
            merchantName,
          });
          await sendOrderStatusPushForOrder({
            orderId: order.id,
            orderNumber,
            status: "accepted",
            fulfillmentType: order.fulfillment_type,
            etaIso: order.fulfillment_type === "delivery"
              ? order.delivery_eta
              : order.pickup_eta,
            customerId: order.customer_id ?? null,
          });
          console.log(`✅ Payment notification sent for order ${order.id}`);
        } catch (notifyError: any) {
          console.error(`⚠️ Failed to send payment notification:`, notifyError.message);
          // Don't fail the webhook if notification fails
        }
      }
    }
  }
};

/**
 * Handle payment_intent.payment_failed - Payment failed
 */
export const handlePaymentIntentFailed: WebhookHandler = async (event, supabase, stripe) => {
  // Handle both thin and snapshot payloads
  const paymentIntent = await ensurePaymentIntent(event.data.object, stripe);

  console.log(`[Webhook] Payment failed: ${paymentIntent.id}`);

  // Update payment_intents table
  await supabase
    .from("payment_intents")
    .update({
      status: paymentIntent.status,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", paymentIntent.id);

  // Find and update associated order
  const { data: paymentRecord } = await supabase
    .from("payment_intents")
    .select("id, metadata")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .maybeSingle();

  if (paymentRecord?.metadata?.order_id) {
    // Get full order details with tenant info
    const { data: order } = await supabase
      .from("orders")
      .select("*, tenants!inner(name, slug, config)")
      .eq("id", paymentRecord.metadata.order_id)
      .maybeSingle();

    await supabase
      .from("orders")
      .update({
        payment_status: "failed",
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentRecord.metadata.order_id);

    // Add order event
    await supabase.from("order_events").insert({
      order_id: paymentRecord.metadata.order_id,
      tenant_id: paymentIntent.metadata?.tenant_id,
      status: "failed",
      title: "Payment failed",
      detail: paymentIntent.last_payment_error?.message || "Payment could not be processed",
      actor: "stripe",
    });

    // Send payment failed notification to customer and platform
    if (order && order.contact_phone) {
      try {
        const { sendPaymentFailed } = await import("./twilio.ts");
        await sendPaymentFailed({
          customerPhone: order.contact_phone,
          customerEmail: order.contact_email,
          customerName: order.contact_name || "Customer",
          orderNumber: order.order_number?.toString() || order.id.slice(-6),
          errorMessage: paymentIntent.last_payment_error?.message,
          merchantName: (order as any).tenants?.name || "Shahirizada Fresh Market",
        });
        console.log(`📱 Payment failed notifications sent for order ${order.id}`);
      } catch (notifError: any) {
        console.error(`⚠️ Failed to send payment failed notifications:`, notifError.message);
      }
    }
  }
};

/**
 * Handle payment_intent.canceled - Payment canceled
 */
export const handlePaymentIntentCanceled: WebhookHandler = async (event, supabase, stripe) => {
  // Handle both thin and snapshot payloads
  const paymentIntent = await ensurePaymentIntent(event.data.object, stripe);

  console.log(`[Webhook] Payment canceled: ${paymentIntent.id}`);

  await supabase
    .from("payment_intents")
    .update({
      status: paymentIntent.status,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", paymentIntent.id);

  const { data: paymentRecord } = await supabase
    .from("payment_intents")
    .select("id, metadata")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .maybeSingle();

  if (paymentRecord?.metadata?.order_id) {
    await supabase
      .from("orders")
      .update({
        payment_status: "unpaid",
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentRecord.metadata.order_id);
  }
};

/**
 * Handle charge.refunded - Refund issued
 */
export const handleChargeRefunded: WebhookHandler = async (event, supabase, stripe) => {
  // Handle both thin and snapshot payloads
  const charge = await ensureCharge(event.data.object, stripe);

  console.log(`[Webhook] Charge refunded: ${charge.id}`);

  if (!charge.payment_intent) return;

  // Update payment intent status
  await supabase
    .from("payment_intents")
    .update({
      status: "refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", charge.payment_intent);

  // Find and update order
  const { data: paymentRecord } = await supabase
    .from("payment_intents")
    .select("id, metadata")
    .eq("stripe_payment_intent_id", charge.payment_intent)
    .maybeSingle();

  if (paymentRecord?.metadata?.order_id) {
    // Get full order details with tenant info
    const { data: order } = await supabase
      .from("orders")
      .select("*, tenants!inner(name, slug, config)")
      .eq("id", paymentRecord.metadata.order_id)
      .maybeSingle();

    await supabase
      .from("orders")
      .update({
        payment_status: "refunded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentRecord.metadata.order_id);

    const refundAmount = charge.amount_refunded / 100;
    await supabase.from("order_events").insert({
      order_id: paymentRecord.metadata.order_id,
      tenant_id: charge.metadata?.tenant_id,
      status: "refunded",
      title: "Payment refunded",
      detail: `Refund of $${refundAmount.toFixed(2)} issued`,
      actor: "stripe",
    });

    // Notify customer and merchant about refund
    if (order) {
      // Prioritize tenant config phone over env var for merchant notifications
      const merchantPhone = (order.tenants as any)?.config?.pickup?.phone || Deno.env.get("MERCHANT_PHONE_NUMBER") || "";
      const customerPhone = order.contact_phone || "";
      const customerEmail = order.contact_email || undefined;
      const customerName = order.contact_name || "Customer";
      const orderNumber = order.order_number?.toString() || order.short_code || order.id.slice(-6);
      const merchantName = order.tenants?.name || "Shahirizada Fresh Market";

      try {
        await sendStatusUpdate({
          customerPhone,
          customerEmail,
          customerName,
          merchantPhone,
          orderNumber,
          status: "refunded",
          statusTitle: "Refund Issued",
          statusDetail: `Good news! A refund of $${refundAmount.toFixed(2)} has been successfully processed back to your original payment method. You should see it in your account within 5-10 business days (depending on your bank). Your money is safe and on its way back to you!`,
          merchantName,
        });
        await sendOrderStatusPushForOrder({
          orderId: order.id,
          orderNumber,
          status: "refunded",
          fulfillmentType: order.fulfillment_type,
          etaIso: order.fulfillment_type === "delivery"
            ? order.delivery_eta
            : order.pickup_eta,
          customerId: order.customer_id ?? null,
        });
        console.log(`💰 Refund notification sent for order ${order.id}`);
      } catch (notifyError: any) {
        console.error(`⚠️ Failed to send refund notification:`, notifyError.message);
      }
    }
  }
};

/**
 * Handle charge.dispute.created - Customer disputed charge
 */
export const handleChargeDisputeCreated: WebhookHandler = async (event, supabase, stripe) => {
  // Handle both thin and snapshot payloads
  const dispute = await ensureDispute(event.data.object, stripe);

  console.log(`[Webhook] Dispute created: ${dispute.id} for charge ${dispute.charge}`);

  // Find order from charge
  const { data: paymentRecord } = await supabase
    .from("payment_intents")
    .select("id, metadata")
    .eq("stripe_payment_intent_id", dispute.payment_intent)
    .maybeSingle();

  let order: any = null;
  if (paymentRecord?.metadata?.order_id) {
    const { data } = await supabase
      .from("orders")
      .select("*, tenants!inner(name, slug, config)")
      .eq("id", paymentRecord.metadata.order_id)
      .maybeSingle();
    order = data;
  }

  // Log dispute for manual review
  await supabase.from("order_events").insert({
    order_id: paymentRecord?.metadata?.order_id || null,
    tenant_id: dispute.metadata?.tenant_id || null,
    status: "disputed",
    title: "Payment disputed",
    detail: `Dispute reason: ${dispute.reason}. Amount: $${(dispute.amount / 100).toFixed(2)}`,
    actor: "stripe",
  });

  // CRITICAL: Notify merchant about dispute immediately via email
  const platformEmails = ["info@sfdify.com", "partner@sfdify.com"];
  const merchantEmail = order?.tenants?.config?.contact?.email || order?.tenants?.config?.email;
  const allRecipients = merchantEmail ? [merchantEmail, ...platformEmails] : platformEmails;
  const disputeAmount = (dispute.amount / 100).toFixed(2);
  const orderNumber = order?.order_number?.toString() || order?.short_code || order?.id?.slice(-6) || "Unknown";

  try {
    await sendEmail({
      to: allRecipients,
      subject: `⚠️ URGENT: Payment Dispute Received - Order #${orderNumber}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #c53030;">⚠️ Payment Dispute Alert</h2>
          <p>A customer has disputed a charge. <strong>Immediate action is required.</strong></p>

          <div style="background: #fff5f5; border-left: 4px solid #c53030; padding: 16px; margin: 16px 0;">
            <p><strong>Order:</strong> #${orderNumber}</p>
            <p><strong>Dispute Amount:</strong> $${disputeAmount}</p>
            <p><strong>Reason:</strong> ${dispute.reason || "Not specified"}</p>
            <p><strong>Dispute ID:</strong> ${dispute.id}</p>
          </div>

          <p>Please log into your Stripe Dashboard to respond to this dispute within the deadline.</p>
          <p><a href="https://dashboard.stripe.com/disputes/${dispute.id}" style="background: #6B0F1A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dispute in Stripe</a></p>

          <p style="color: #666; font-size: 14px; margin-top: 24px;">
            Disputes must be responded to promptly to avoid automatic loss.
            Gather any evidence of the transaction (receipts, delivery confirmation, etc.) to submit.
          </p>
        </div>
      `,
      text: `URGENT: Payment Dispute - Order #${orderNumber}\n\nA customer has disputed a $${disputeAmount} charge.\nReason: ${dispute.reason || "Not specified"}\n\nLog into Stripe Dashboard immediately to respond.`,
    });
    console.log(`⚠️ Dispute notification email sent for order ${orderNumber}`);
  } catch (notifyError: any) {
    console.error(`⚠️ Failed to send dispute notification:`, notifyError.message);
  }
};

/**
 * Main webhook router - maps event types to handlers
 * (Platform account events only - payment lifecycle)
 */
export const WEBHOOK_HANDLERS: Record<string, WebhookHandler> = {
  "payment_intent.succeeded": handlePaymentIntentSucceeded,
  "payment_intent.payment_failed": handlePaymentIntentFailed,
  "payment_intent.canceled": handlePaymentIntentCanceled,
  "charge.refunded": handleChargeRefunded,
  "charge.dispute.created": handleChargeDisputeCreated,
};
