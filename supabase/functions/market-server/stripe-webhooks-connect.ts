/**
 * Stripe Connect Webhook Handler
 *
 * Handles events from Stripe Connect accounts (merchants).
 * Sends SMS/Email notifications via Twilio for:
 * - Transfer events (funds to merchant)
 * - Application fee events (platform fees)
 * - Account updates (merchant account status changes)
 *
 * This webhook listens to "Connected and v2 accounts" events in Stripe Dashboard.
 *
 * NOTE: Handlers support both SNAPSHOT (full object) and THIN (ID only) payloads.
 * If Stripe sends a thin payload, we fetch the full object via API.
 */

import Stripe from "npm:stripe@15.11.0";
import { createClient } from "npm:@supabase/supabase-js";
import {
  sendEmail,
  sendSMS,
} from "./twilio.ts";

type StripeMode = "prod" | "test";

const STRIPE_SECRET_KEYS: Record<StripeMode, string[]> = {
  prod: ["STRIPE_SECRET_KEY", "STRIPE_SECRET__KEY"],
  test: ["STRIPE_TEST_SECRET_KEY", "STRIPE_SECRET_KEY_TEST", "STRIPE_SECRET_KEY_SANDBOX"],
};

let currentStripeMode: StripeMode = "prod";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

function resolveStripeSecret(mode: StripeMode): string {
  for (const key of STRIPE_SECRET_KEYS[mode]) {
    const value = Deno.env.get(key);
    if (value && `${value}`.trim().length > 0) return value;
  }
  if (mode === "test") {
    for (const key of STRIPE_SECRET_KEYS.prod) {
      const value = Deno.env.get(key);
      if (value && `${value}`.trim().length > 0) return value;
    }
  }
  throw new Error(`STRIPE_SECRET_KEY not configured for mode=${mode}`);
}

function getStripeClient(mode: StripeMode = currentStripeMode): Stripe {
  const secretKey = resolveStripeSecret(mode);
  return new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/**
 * Check if the webhook payload is a thin payload (only ID) vs full snapshot
 */
function isThinPayload(obj: any): boolean {
  const keys = Object.keys(obj || {});
  return keys.length <= 3 && keys.includes("id") && !keys.includes("amount") && !keys.includes("status");
}

/**
 * Ensure we have a full Transfer object (fetch if thin payload)
 */
async function ensureTransfer(obj: any, stripe: Stripe): Promise<Stripe.Transfer> {
  if (isThinPayload(obj) && obj.id) {
    console.log(`[Connect Webhook] Thin payload detected, fetching full Transfer: ${obj.id}`);
    return await stripe.transfers.retrieve(obj.id);
  }
  return obj as Stripe.Transfer;
}

/**
 * Ensure we have a full ApplicationFee object (fetch if thin payload)
 */
async function ensureApplicationFee(obj: any, stripe: Stripe): Promise<Stripe.ApplicationFee> {
  if (isThinPayload(obj) && obj.id) {
    console.log(`[Connect Webhook] Thin payload detected, fetching full ApplicationFee: ${obj.id}`);
    return await stripe.applicationFees.retrieve(obj.id);
  }
  return obj as Stripe.ApplicationFee;
}

/**
 * Ensure we have a full Account object (fetch if thin payload)
 */
async function ensureAccount(obj: any, stripe: Stripe): Promise<Stripe.Account> {
  if (isThinPayload(obj) && obj.id) {
    console.log(`[Connect Webhook] Thin payload detected, fetching full Account: ${obj.id}`);
    return await stripe.accounts.retrieve(obj.id);
  }
  return obj as Stripe.Account;
}

/**
 * Notify merchant about successful transfer (payout)
 */
async function notifyTransfer(params: {
  merchantName: string;
  amount: number;
  currency: string;
  transferId: string;
  merchantEmail?: string;
  merchantPhone?: string;
}): Promise<void> {
  const amountFormatted = `$${(params.amount / 100).toFixed(2)}`;

  // Send email notification
  if (params.merchantEmail) {
    await sendEmail({
      to: params.merchantEmail,
      subject: `💰 Payout Initiated - ${amountFormatted}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">💰 Payout on the Way!</h2>

          <p style="color: #374151;">Great news! A payout has been initiated to your bank account.</p>

          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #065f46;">${amountFormatted}</p>
            <p style="margin: 8px 0 0 0; color: #6b7280;">Transfer ID: ${params.transferId}</p>
          </div>

          <p style="color: #6b7280;">
            This transfer typically arrives in your bank account within 2-3 business days,
            depending on your bank.
          </p>

          <p style="margin-top: 30px; color: #9ca3af; font-size: 12px;">
            Shahirizada Fresh Market - Powered by Tabsy Platform
          </p>
        </div>
      `,
      text: `Payout Initiated - ${amountFormatted} has been sent to your bank account. Transfer ID: ${params.transferId}. Expect it in 2-3 business days.`,
    });
  }

  // SMS notification for important payouts
  if (params.merchantPhone && params.amount >= 5000) { // Only SMS for payouts $50+
    await sendSMS({
      to: params.merchantPhone,
      message: `💰 Shahirizada: Payout of ${amountFormatted} is on the way to your bank! Transfer ID: ${params.transferId.slice(-8)}`,
    }).catch(err => console.warn("SMS notification failed:", err.message));
  }
}

/**
 * Notify internal platform team about important events
 */
async function notifyInternalTeam(message: string): Promise<void> {
  const platformEmails = ["info@sfdify.com", "partner@sfdify.com"];

  try {
    await sendEmail({
      to: platformEmails,
      subject: `🔔 Platform Alert - Shahirizada`,
      html: `
        <div style="font-family: monospace; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6B0F1A;">🔔 Platform Alert</h2>
          <pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap;">${message}</pre>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
            Shahirizada Fresh Market - Automated Alert
          </p>
        </div>
      `,
      text: `Platform Alert:\n\n${message}`,
    });
  } catch (err: any) {
    console.error("Failed to notify internal team:", err.message);
  }
}

/**
 * Verify Stripe webhook signature
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  mode: StripeMode
): Promise<Stripe.Event> {
  const stripe = getStripeClient(mode);
  return await stripe.webhooks.constructEventAsync(payload, signature, secret);
}

/**
 * Get merchant info from Connect account ID
 */
async function getMerchantInfo(connectAccountId: string) {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug, name, config")
    .eq("stripe_connect_account_id", connectAccountId)
    .maybeSingle();

  if (!tenant) {
    return null;
  }

  const merchantEmail = tenant.config?.contact?.email || tenant.config?.email;
  const merchantPhone = tenant.config?.contact?.phone || tenant.config?.phone;

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name || "Merchant",
    email: merchantEmail,
    phone: merchantPhone,
  };
}

/**
 * Handle transfer.created event
 */
async function handleTransferCreated(event: Stripe.Event) {
  const stripe = getStripeClient();
  // Handle both thin and snapshot payloads
  const transfer = await ensureTransfer(event.data.object, stripe);

  console.log("💰 Transfer created:", {
    id: transfer.id,
    amount: transfer.amount,
    destination: transfer.destination,
  });

  const merchant = await getMerchantInfo(transfer.destination as string);

  if (merchant) {
    await notifyTransfer({
      merchantName: merchant.name,
      amount: transfer.amount,
      currency: transfer.currency,
      transferId: transfer.id,
      merchantEmail: merchant.email,
      merchantPhone: merchant.phone,
    });

    console.log("✅ Transfer notification sent to:", merchant.name);
  } else {
    console.warn("⚠️ Merchant not found for Connect account:", transfer.destination);
  }
}

/**
 * Handle application_fee.created event
 */
async function handleApplicationFeeCreated(event: Stripe.Event) {
  const stripe = getStripeClient();
  // Handle both thin and snapshot payloads
  const fee = await ensureApplicationFee(event.data.object, stripe);

  console.log("💵 Application fee created:", {
    id: fee.id,
    amount: fee.amount,
    account: fee.account,
  });

  // Log platform fee for internal accounting
  const message = `
💵 PLATFORM FEE COLLECTED

Amount: $${(fee.amount / 100).toFixed(2)}
Fee ID: ${fee.id}
Account: ${fee.account}
  `.trim();

  console.log(message);
}

/**
 * Handle application_fee.refunded event
 */
async function handleApplicationFeeRefunded(event: Stripe.Event) {
  const stripe = getStripeClient();
  // Handle both thin and snapshot payloads
  const fee = await ensureApplicationFee(event.data.object, stripe);

  console.log("💸 Application fee refunded:", {
    id: fee.id,
    amount: fee.amount_refunded,
    account: fee.account,
  });

  // Notify internal team about fee refund
  const message = `
💸 PLATFORM FEE REFUNDED

Amount: $${(fee.amount_refunded / 100).toFixed(2)}
Fee ID: ${fee.id}
Account: ${fee.account}
  `.trim();

  await notifyInternalTeam(message);
}

/**
 * Handle account.updated event
 */
async function handleAccountUpdated(event: Stripe.Event) {
  const stripe = getStripeClient();
  // Handle both thin and snapshot payloads
  const account = await ensureAccount(event.data.object, stripe);

  console.log("🔄 Connect account updated:", {
    id: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  });

  const merchant = await getMerchantInfo(account.id);

  // Check if account became restricted or disabled
  if (!account.charges_enabled || !account.payouts_enabled) {
    const message = `
⚠️ CONNECT ACCOUNT ISSUE

Merchant: ${merchant?.name || "Unknown"}
Account: ${account.id}
Charges Enabled: ${account.charges_enabled ? "Yes" : "No"}
Payouts Enabled: ${account.payouts_enabled ? "Yes" : "No"}

${account.requirements?.currently_due?.length ? `Missing: ${account.requirements.currently_due.join(", ")}` : ""}

Action required: Contact merchant
    `.trim();

    await notifyInternalTeam(message);

    // Email merchant about account issues
    if (merchant?.email && account.requirements?.currently_due?.length) {
      await sendEmail({
        to: merchant.email,
        subject: "⚠️ Action Required - Stripe Account",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">⚠️ Account Action Required</h2>

            <p style="color: #666;">
              Your Stripe account needs attention. Please complete the following requirements:
            </p>

            <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <ul>
                ${account.requirements.currently_due.map((req) => `<li>${req}</li>`).join("")}
              </ul>
            </div>

            <p style="color: #666;">
              Until these are completed, you may not be able to accept payments or receive payouts.
            </p>

            <p style="color: #666;">
              Please contact the Tabsy team if you need assistance.
            </p>

            <p style="margin-top: 30px; color: #999; font-size: 11px;">
              Powered by Tabsy Platform
            </p>
          </div>
        `,
      });
    }
  }

  // Update tenant record with latest account status
  if (merchant) {
    await supabase
      .from("tenants")
      .update({
        config: {
          ...(merchant as any).config,
          stripe_account_status: {
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            requirements_currently_due: account.requirements?.currently_due || [],
            updated_at: new Date().toISOString(),
          },
        },
      })
      .eq("id", merchant.id);
  }
}

/**
 * Handle account.application.deauthorized event
 */
async function handleAccountDeauthorized(event: Stripe.Event) {
  const stripe = getStripeClient();
  // Handle both thin and snapshot payloads
  const account = await ensureAccount(event.data.object, stripe);

  console.warn("🚫 Connect account deauthorized:", {
    id: account.id,
  });

  const merchant = await getMerchantInfo(account.id);

  const message = `
🚫 MERCHANT DISCONNECTED

Merchant: ${merchant?.name || "Unknown"}
Account: ${account.id}

The merchant has disconnected their Stripe account.
They can no longer accept payments.
  `.trim();

  await notifyInternalTeam(message);

  // Update tenant to disable ordering
  if (merchant) {
    await supabase
      .from("tenants")
      .update({
        stripe_connect_account_id: null,
        config: {
          ...(merchant as any).config,
          ordering_disabled: true,
          ordering_disabled_reason: "Stripe account disconnected",
        },
      })
      .eq("id", merchant.id);
  }
}

/**
 * Handle account.external_account.created event
 */
async function handleExternalAccountCreated(event: Stripe.Event) {
  const externalAccount = event.data.object as any;

  console.log("🏦 Bank account added:", {
    account: externalAccount.account,
    bankName: externalAccount.bank_name,
    last4: externalAccount.last4,
  });

  const merchant = await getMerchantInfo(externalAccount.account);

  if (merchant?.email) {
    await sendEmail({
      to: merchant.email,
      subject: "✅ Bank Account Connected",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">✅ Bank Account Connected</h2>

          <p style="color: #666;">
            Your bank account has been successfully connected to your Tabsy merchant account.
          </p>

          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Bank:</strong> ${externalAccount.bank_name || "Unknown"}</p>
            <p><strong>Account:</strong> ****${externalAccount.last4}</p>
          </div>

          <p style="color: #666;">
            You will now receive payouts to this account.
          </p>

          <p style="margin-top: 30px; color: #999; font-size: 11px;">
            Powered by Tabsy Platform
          </p>
        </div>
      `,
    });
  }
}

/**
 * Handle account.external_account.deleted event
 */
async function handleExternalAccountDeleted(event: Stripe.Event) {
  const externalAccount = event.data.object as any;

  console.warn("🏦 Bank account removed:", {
    account: externalAccount.account,
    last4: externalAccount.last4,
  });

  const merchant = await getMerchantInfo(externalAccount.account);

  const message = `
⚠️ BANK ACCOUNT REMOVED

Merchant: ${merchant?.name || "Unknown"}
Account: ****${externalAccount.last4}

The merchant removed their bank account.
They will not receive payouts until a new account is added.
  `.trim();

  await notifyInternalTeam(message);
}

/**
 * Main webhook handler
 */
export async function handleConnectWebhook(
  rawBody: string,
  signature: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const prodWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const testWebhookSecret = Deno.env.get("STRIPE_TEST_WEBHOOK_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");
    if (!prodWebhookSecret && !testWebhookSecret) {
      return { success: false, error: "Webhook secret not configured" };
    }

    let event: Stripe.Event;
    let mode: StripeMode = "prod";
    try {
      if (!prodWebhookSecret) throw new Error("skip prod verification");
      event = await verifyWebhookSignature(rawBody, signature, prodWebhookSecret, "prod");
      currentStripeMode = "prod";
    } catch (err) {
      if (testWebhookSecret) {
        event = await verifyWebhookSignature(rawBody, signature, testWebhookSecret, "test");
        mode = "test";
        currentStripeMode = "test";
      } else {
        throw err;
      }
    }

    console.log(`[Connect Webhook] ${event.type} (${event.id})`);

    // Route to appropriate handler
    switch (event.type) {
      case "transfer.created":
        await handleTransferCreated(event);
        break;

      case "transfer.reversed":
        // Transfer was reversed (funds clawed back from connected account)
        console.log(`[Connect Webhook] Transfer reversed: ${(event.data.object as any).id}`);
        await notifyInternalTeam(`Transfer reversed: ${(event.data.object as any).id} - Amount: $${((event.data.object as any).amount / 100).toFixed(2)}`);
        break;

      case "application_fee.created":
        await handleApplicationFeeCreated(event);
        break;

      case "application_fee.refunded":
        await handleApplicationFeeRefunded(event);
        break;

      case "account.updated":
        await handleAccountUpdated(event);
        break;

      case "account.application.deauthorized":
        await handleAccountDeauthorized(event);
        break;

      case "account.external_account.created":
        await handleExternalAccountCreated(event);
        break;

      case "account.external_account.deleted":
        await handleExternalAccountDeleted(event);
        break;

      default:
        console.log(`[Connect Webhook] Unhandled event type: ${event.type}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("[Connect Webhook] Error:", error.message);
    return { success: false, error: error.message };
  }
}
