/**
 * SMS & Email Notification System
 *
 * Sends notifications to:
 * - Customer (order updates)
 * - Merchant owner (new orders, status changes)
 * - Platform owners (all order events for monitoring)
 */

// Platform owner contact info
const PLATFORM_EMAILS = ["info@sfdify.com", "partner@sfdify.com"];
const PLATFORM_PHONE = "+17732170707";
const DEFAULT_TIMEZONE = Deno.env.get("MARKET_TIMEZONE") || "America/Chicago";

// Detect test environment based on Supabase project URL
const TEST_PROJECT_REF = "pbzpqsdjaiynrpjpubai";
const isTestEnvironment = (): boolean => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  return supabaseUrl.includes(TEST_PROJECT_REF);
};

// Prefix for test environment SMS messages
const getTestPrefix = (): string => isTestEnvironment() ? "🧪 TEST: " : "";

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromPhone: string;
}

interface SendGridConfig {
  apiKey: string;
}

function getTwilioConfig(): TwilioConfig {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromPhone = Deno.env.get("TWILIO_FROM_PHONE");

  if (!accountSid || !authToken || !fromPhone) {
    throw new Error("Twilio credentials not configured");
  }

  return { accountSid, authToken, fromPhone };
}

function getSendGridConfig(): SendGridConfig {
  const apiKey = Deno.env.get("SENDGRID_API_KEY");
  if (!apiKey) {
    throw new Error("SendGrid API key not configured");
  }
  return { apiKey };
}

function resolveTimezone(timezone?: string | null): string {
  if (timezone && typeof timezone === "string" && timezone.trim().length) {
    return timezone.trim();
  }
  return DEFAULT_TIMEZONE;
}

function safeDateFromIso(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatEtaTime(value?: string | null, timezone?: string | null): string | null {
  const date = safeDateFromIso(value);
  if (!date) return null;
  const tz = resolveTimezone(timezone);
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz,
      timeZoneName: "short",
    }).format(date);
  } catch (error) {
    console.warn("Failed to format ETA time", error);
    return null;
  }
}

function formatEtaDateTime(value?: string | null, timezone?: string | null): string | null {
  const date = safeDateFromIso(value);
  if (!date) return null;
  const tz = resolveTimezone(timezone);
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: tz,
    }).format(date);
  } catch (error) {
    console.warn("Failed to format ETA date/time", error);
    return null;
  }
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Add + if not present
  if (!cleaned.startsWith("+")) {
    // Assume US number if no country code
    cleaned = "+1" + cleaned;
  }

  return cleaned;
}

/**
 * Send SMS via Twilio (Simple format as requested)
 */
export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const config = getTwilioConfig();
    const formattedTo = formatPhoneNumber(to);

    console.log(`📱 Sending SMS to ${formattedTo}`);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": "Basic " + btoa(`${config.accountSid}:${config.authToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          Body: message,
          From: config.fromPhone,
          To: formattedTo,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Twilio SMS error:", error);
      return false;
    }

    const result = await response.json();
    console.log(`✅ SMS sent successfully - SID: ${result.sid}`);
    return true;
  } catch (error: any) {
    console.error("❌ SMS send failed:", error.message);
    return false;
  }
}

/**
 * Send Email via SendGrid
 */
export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const toAddresses = Array.isArray(params.to) ? params.to : [params.to];
  const fromEmail =
    Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@tabsy.us";
  const fromName =
    Deno.env.get("SENDGRID_FROM_NAME") || "Shahirizada Fresh Market";
  const replyToEmail =
    Deno.env.get("SENDGRID_REPLY_TO_EMAIL") || "info@tabsy.us";

  console.log(`📧 Attempting to send email:`, {
    to: toAddresses,
    from: fromEmail,
    fromName,
    subject: params.subject,
    hasApiKey: Boolean(Deno.env.get("SENDGRID_API_KEY")),
  });

  try {
    const config = getSendGridConfig();

    const requestBody = {
      personalizations: [{
        to: toAddresses.map(email => ({ email })),
      }],
      from: {
        email: fromEmail,
        name: fromName
      },
      reply_to: {
        email: replyToEmail,
        name: fromName
      },
      subject: params.subject,
      content: [
        {
          type: "text/html",
          value: params.html,
        },
        ...(params.text ? [{
          type: "text/plain",
          value: params.text,
        }] : []),
      ],
    };

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // SendGrid returns 202 Accepted for successful sends
    if (!response.ok && response.status !== 202) {
      const error = await response.text();
      console.error("❌ SendGrid API error:", {
        status: response.status,
        statusText: response.statusText,
        error,
        to: toAddresses,
        from: fromEmail,
      });
      return false;
    }

    console.log(`✅ Email sent successfully via SendGrid (status: ${response.status}) to: ${toAddresses.join(", ")}`);
    return true;
  } catch (error: any) {
    console.error("❌ SendGrid request failed:", {
      error: error.message,
      stack: error.stack,
      to: toAddresses,
      from: fromEmail,
    });
    return false;
  }
}

/**
 * Send Order Confirmation (Customer, Merchant, Platform)
 */
export async function sendOrderConfirmation(params: {
  customerPhone: string;
  customerEmail?: string;
  customerName: string;
  merchantNotificationPhone: string; // Phone to send notifications TO merchant
  merchantContactPhone?: string; // Phone to display TO customer
  merchantAddress?: string;
  orderNumber: string;
  orderTotal: number;
  fulfillmentType: "pickup" | "delivery";
  eta?: string;
  itemsCount: number;
  items?: Array<{ name: string; qty: number; price: number }>;
  merchantName: string;
  customerTimezone?: string;
}): Promise<void> {
  const amount = (params.orderTotal / 100).toFixed(2);
  const type = params.fulfillmentType === "pickup" ? "Pickup" : "Delivery";
  const etaTime = formatEtaTime(params.eta, params.customerTimezone);
  const etaDateTime = formatEtaDateTime(params.eta, params.customerTimezone);

  // Format order items for SMS
  const itemsList = params.items?.map(item =>
    `${item.qty}x ${item.name} - $${(item.price / 100).toFixed(2)}`
  ).join('\n') || `${params.itemsCount} item(s)`;

  // Build merchant contact info section (only if phone is provided)
  const merchantContactSection = [
    params.merchantName,
    params.merchantContactPhone || "", // Only show if provided
    params.merchantAddress || "",
  ].filter(Boolean).join('\n');

  // SMS to Customer
  const customerSMS = `
${getTestPrefix()}Order Confirmed! #${params.orderNumber}

Thank you ${params.customerName}!

YOUR ORDER:
${itemsList}

Total: $${amount}
Type: ${type}
${etaTime ? `Ready: ${etaTime}` : ""}

${merchantContactSection}
`.trim();

  await sendSMS(params.customerPhone, customerSMS);

  // Email to Customer
  if (params.customerEmail) {
    const itemsHtml = params.items?.map(item =>
      `<li>${item.qty}x ${item.name} - $${(item.price / 100).toFixed(2)}</li>`
    ).join('') || `<li>${params.itemsCount} item(s)</li>`;

    await sendEmail({
      to: params.customerEmail,
      subject: `Order Confirmation #${params.orderNumber} - ${params.merchantName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6B0F1A;">Order Confirmed!</h2>
          <p>Thank you for your order, ${params.customerName}!</p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Order #:</strong> ${params.orderNumber}</p>
            <p><strong>Type:</strong> ${type}</p>
            ${etaDateTime ? `<p><strong>Ready:</strong> ${etaDateTime}</p>` : ""}

            <h3 style="margin-top: 20px; margin-bottom: 10px;">Your Order:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${itemsHtml}
            </ul>

            <p style="margin-top: 20px; font-size: 18px;"><strong>Total:</strong> $${amount}</p>
          </div>

          <p>We'll notify you when your order status changes.</p>

          <div style="background: #fff; padding: 15px; border-top: 2px solid #6B0F1A; margin-top: 30px;">
            <p style="margin: 0; font-weight: bold;">${params.merchantName}</p>
            ${params.merchantContactPhone ? `<p style="margin: 5px 0;">Phone: ${params.merchantContactPhone}</p>` : ""}
            ${params.merchantAddress ? `<p style="margin: 5px 0; color: #666;">${params.merchantAddress}</p>` : ""}
          </div>
        </div>
      `,
    });
  }

  // SMS to Merchant (only if notification phone is configured)
  if (params.merchantNotificationPhone) {
    const merchantSMS = `
${getTestPrefix()}🔔 NEW ORDER #${params.orderNumber}

Customer: ${params.customerName}
Phone: ${params.customerPhone}

ORDER ITEMS:
${itemsList}

Total: $${amount}
Type: ${type}
${etaTime ? `Ready by: ${etaTime}` : ""}

Please prepare order.
`.trim();

    await sendSMS(params.merchantNotificationPhone, merchantSMS);
  }

  // Email to Platform Owners
  const platformItemsHtml = params.items?.map(item =>
    `<tr><td style="padding: 8px; border: 1px solid #ddd;">${item.qty}x</td><td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td><td style="padding: 8px; border: 1px solid #ddd;">$${(item.price / 100).toFixed(2)}</td></tr>`
  ).join('') || `<tr><td colspan="3" style="padding: 8px; border: 1px solid #ddd;">${params.itemsCount} item(s)</td></tr>`;

  await sendEmail({
    to: PLATFORM_EMAILS,
    subject: `[REDIRECT] New Order #${params.orderNumber} - ${params.merchantName}`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h3>New Order Received</h3>
        <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Order #:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${params.orderNumber}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Merchant:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${params.merchantName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Customer:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${params.customerName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${params.customerPhone}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Type:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${type}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Total:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">$${amount}</td></tr>
        </table>

        <h4>Order Items:</h4>
        <table style="border-collapse: collapse; width: 100%;">
          <tr style="background: #f5f5f5;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Qty</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Item</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Price</th>
          </tr>
          ${platformItemsHtml}
        </table>
      </div>
    `,
  });

  // SMS to Platform (brief summary)
  const itemsSummary = params.items?.slice(0, 3).map(item =>
    `${item.qty}x ${item.name}`
  ).join(', ') || `${params.itemsCount} items`;
  const moreItems = params.items && params.items.length > 3 ? ` +${params.items.length - 3} more` : '';

  const platformSMS = `
${getTestPrefix()}REDIRECT: 🔔 Order #${params.orderNumber}

Merchant: ${params.merchantName}
Customer: ${params.customerName}
Items: ${itemsSummary}${moreItems}
Total: $${amount} | ${type}
`.trim();

  await sendSMS(PLATFORM_PHONE, platformSMS);
}

/**
 * Send Status Update (Customer, Merchant, Platform)
 */
export async function sendStatusUpdate(params: {
  customerPhone: string;
  customerEmail?: string;
  customerName: string;
  merchantPhone: string;
  orderNumber: string;
  status: string;
  statusTitle: string;
  statusDetail: string;
  merchantName: string;
  courierName?: string;
  trackingUrl?: string;
}): Promise<void> {
  // SMS to Customer
  if (params.customerPhone) {
    const customerSMS = `
${getTestPrefix()}${params.statusTitle} - Order #${params.orderNumber}

${params.statusDetail}
${params.courierName ? `Courier: ${params.courierName}` : ""}
${params.trackingUrl ? `Track: ${params.trackingUrl}` : ""}

${params.merchantName}
`.trim();

    await sendSMS(params.customerPhone, customerSMS);
  }

  // Email to Customer
  if (params.customerEmail) {
    await sendEmail({
      to: params.customerEmail,
      subject: `${params.statusTitle} - Order #${params.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6B0F1A;">${params.statusTitle}</h2>
          <p>Hello ${params.customerName},</p>
          <p>${params.statusDetail}</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Order #:</strong> ${params.orderNumber}</p>
            ${params.courierName ? `<p><strong>Courier:</strong> ${params.courierName}</p>` : ""}
            ${params.trackingUrl ? `<p><a href="${params.trackingUrl}" style="color: #6B0F1A;">Track Your Order</a></p>` : ""}
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            ${params.merchantName}
          </p>
        </div>
      `,
    });
  }

  // SMS to Merchant
  if (params.merchantPhone) {
    const merchantSMS = `
${getTestPrefix()}📦 Order #${params.orderNumber} - ${params.statusTitle}

Customer: ${params.customerName}
Status: ${params.statusDetail}
${params.courierName ? `Courier: ${params.courierName}` : ""}
`.trim();

    await sendSMS(params.merchantPhone, merchantSMS);
  }

  // Email to Platform Owners
  await sendEmail({
    to: PLATFORM_EMAILS,
    subject: `[REDIRECT] Order ${params.status} - #${params.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h3>Order Status Update</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Order #:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${params.orderNumber}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Status:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${params.statusTitle}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Detail:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${params.statusDetail}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Merchant:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${params.merchantName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Customer:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${params.customerName}</td></tr>
          ${params.courierName ? `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Courier:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${params.courierName}</td></tr>` : ""}
          ${params.trackingUrl ? `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Tracking:</strong></td><td style="padding: 8px; border: 1px solid #ddd;"><a href="${params.trackingUrl}">View</a></td></tr>` : ""}
        </table>
      </div>
    `,
  });
}

/**
 * Send Pickup Ready Notification
 */
export async function sendPickupReady(params: {
  customerPhone: string;
  customerEmail?: string;
  customerName: string;
  merchantPhone: string;
  orderNumber: string;
  merchantName: string;
}): Promise<void> {
  // SMS to Customer
  const customerSMS = `
${getTestPrefix()}✅ Order Ready! #${params.orderNumber}

Hi ${params.customerName}!

Your order is ready for pickup.

${params.merchantName}
Naperville, IL

Please pickup within the next hour.
`.trim();

  await sendSMS(params.customerPhone, customerSMS);

  // Email to Customer
  if (params.customerEmail) {
    await sendEmail({
      to: params.customerEmail,
      subject: `Order Ready for Pickup - #${params.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6B0F1A;">✅ Order Ready!</h2>
          <p>Hi ${params.customerName},</p>
          <p>Your order #${params.orderNumber} is ready for pickup!</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>📍 Location:</strong><br>
            ${params.merchantName}<br>
            Naperville, IL</p>
            <p><strong>⏰ Pickup Window:</strong><br>
            Please pickup within the next hour</p>
          </div>
          <p>See you soon!</p>
        </div>
      `,
    });
  }

  // SMS to Merchant
  const merchantSMS = `
${getTestPrefix()}✅ Order Ready #${params.orderNumber}

Customer: ${params.customerName} notified.
Order ready for pickup.
`.trim();

  await sendSMS(params.merchantPhone, merchantSMS);

  // Notify Platform
  await sendEmail({
    to: PLATFORM_EMAILS,
    subject: `[REDIRECT] Pickup Ready - Order #${params.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h3>Pickup Order Ready</h3>
        <p><strong>Order #:</strong> ${params.orderNumber}</p>
        <p><strong>Customer:</strong> ${params.customerName}</p>
        <p><strong>Merchant:</strong> ${params.merchantName}</p>
        <p><strong>Status:</strong> Ready for customer pickup</p>
      </div>
    `,
  });
}

/**
 * Send Payment Failed Notification
 * Notifies customer to try again with a different payment method
 * Notifies platform for tracking (NOT merchant - failed payments are common)
 */
export async function sendPaymentFailed(params: {
  customerPhone: string;
  customerEmail?: string;
  customerName: string;
  orderNumber: string;
  errorMessage?: string;
  merchantName: string;
}): Promise<void> {
  const friendlyError = params.errorMessage || "Your payment could not be processed";

  // SMS to Customer
  const customerSMS = `
${getTestPrefix()}Payment Issue - Order #${params.orderNumber}

Hi ${params.customerName},

${friendlyError}

Please try again with a different payment method.

${params.merchantName}
`.trim();

  await sendSMS(params.customerPhone, customerSMS);

  // Email to Customer
  if (params.customerEmail) {
    await sendEmail({
      to: params.customerEmail,
      subject: `Payment Issue - Order #${params.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Payment Issue</h2>
          <p>Hi ${params.customerName},</p>
          <p>We were unable to process your payment for order #${params.orderNumber}.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p style="margin: 0;"><strong>Reason:</strong> ${friendlyError}</p>
          </div>
          <p>Please try again with a different payment method. Common issues include:</p>
          <ul>
            <li>Card declined by your bank</li>
            <li>Insufficient funds</li>
            <li>Expired card</li>
            <li>Incorrect card details</li>
          </ul>
          <p>If you continue to experience issues, please contact your bank or try a different card.</p>
          <p>Thank you,<br>${params.merchantName}</p>
        </div>
      `,
    });
  }

  // Notify Platform (NOT merchant - failed payments are common)
  await sendEmail({
    to: PLATFORM_EMAILS,
    subject: `[ALERT] Payment Failed - Order #${params.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h3 style="color: #dc2626;">Payment Failed</h3>
        <p><strong>Order #:</strong> ${params.orderNumber}</p>
        <p><strong>Customer:</strong> ${params.customerName}</p>
        <p><strong>Phone:</strong> ${params.customerPhone}</p>
        <p><strong>Email:</strong> ${params.customerEmail || "N/A"}</p>
        <p><strong>Merchant:</strong> ${params.merchantName}</p>
        <p><strong>Error:</strong> ${friendlyError}</p>
      </div>
    `,
  });
}
