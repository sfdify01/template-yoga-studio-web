import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import Stripe from "npm:stripe@15.11.0";
import * as kv from "./kv_store.ts";
import { createConnectPaymentIntent, retrieveStripePaymentIntent, type StripeMode } from "./stripe.ts";
import {
  cancelUberDelivery,
  createUberDelivery,
  getUberDeliveryStatus,
  isUberConfigured,
  quoteUberDelivery,
  updateUberPickupReady,
} from "./uber.ts";
import { verifyWebhookSignature, WEBHOOK_HANDLERS } from "./stripe-webhooks.ts";
import { handleConnectWebhook } from "./stripe-webhooks-connect.ts";
import {
  handleUberWebhook,
  getUberEventDetail,
  getUberEventTitle,
  mapUberStatusToOrderStatus,
  mapUberToCourierStatus,
} from "./uber-webhooks.ts";
import {
  createConnectAccount,
  createAccountLink,
  getConnectAccount,
  isAccountReady,
  getAccountStatus,
  createLoginLink,
} from "./stripe-connect.ts";
import {
  sendOrderConfirmation,
  sendStatusUpdate,
} from "./twilio.ts";
import { sendOrderStatusPushForOrder, updateLiveActivity, isOneSignalConfigured, sendNewOrderAdminPush } from "./notifications.ts";
import {
  BlogPost,
  dedupeBlogPosts,
  getBlogStore,
  normalizePostInput,
  saveBlogStore,
} from "./blog.ts";
import {
  MenuResponse,
  getCachedMenu,
  loadMenu,
  sanitizeMenuPayload,
  saveMenuData,
  syncMenuToTable,
} from "./menu.ts";
import {
  sanitizeFileName,
  signedUrlFromBucket,
  uploadToBucket,
} from "./storage.ts";
import { nowIso } from "./utils.ts";
import type { UberMode } from "./uber.ts";

type SessionInfo = {
  hasCookie: boolean;
  sessionId: string | null;
  session: { expiry?: number } | null;
};

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

type StorageUploadParams = {
  bucket: string;
  file: File;
  filename?: string;
};

const app = new Hono();

const getEnv = (keys: string[], fallback = "") => {
  for (const key of keys) {
    const value = Deno.env.get(key);
    if (value && `${value}`.length > 0) {
      return value;
    }
  }
  return fallback;
};

const supabase = createClient(
  getEnv(["SUPABASE_URL", "UPABASE_URL", "VITE_SUPABASE_URL"]),
  getEnv(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "UPABASE_SERVICE_ROLE_KEY"]),
);

// Initialize Stripe clients per environment (prod/test)
type StripeModeRuntime = StripeMode;
const STRIPE_SECRET_KEYS: Record<StripeModeRuntime, string[]> = {
  prod: ["STRIPE_SECRET_KEY", "STRIPE_SECRET__KEY"],
  test: ["STRIPE_TEST_SECRET_KEY", "STRIPE_SECRET_KEY_TEST", "STRIPE_SECRET_KEY_SANDBOX"],
};

const stripeClients: Record<StripeModeRuntime, Stripe | null> = {
  prod: null,
  test: null,
};

function resolveStripeSecret(mode: StripeModeRuntime): string {
  for (const key of STRIPE_SECRET_KEYS[mode]) {
    const value = Deno.env.get(key);
    if (value && `${value}`.trim().length > 0) return value;
  }
  // Fallback to prod secret for test mode if dedicated test secret not set (useful for single-env setups)
  if (mode === "test") {
    for (const key of STRIPE_SECRET_KEYS.prod) {
      const value = Deno.env.get(key);
      if (value && `${value}`.trim().length > 0) return value;
    }
  }
  throw new Error(`STRIPE_SECRET_KEY not configured for mode=${mode}`);
}

function getStripe(mode: StripeModeRuntime = "prod"): Stripe {
  const cached = stripeClients[mode];
  if (cached) return cached;
  const secretKey = resolveStripeSecret(mode);
  const client = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });
  stripeClients[mode] = client;
  return client;
}

app.use("*", logger());
app.use("*", cors({
  origin: (origin) => {
    // Allow requests from these origins with credentials
    const allowedOrigins = [
      // Production
      "https://shahirizadameatmarket.com",
      "https://www.shahirizadameatmarket.com",
      // Test environment
      "https://test.shahirizadameatmarket.com",
      // Local development
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
    ];
    // Return the origin if it's allowed, otherwise return the first allowed origin
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  },
  allowHeaders: ["authorization", "content-type", "apikey", "stripe-signature", "x-tabsy-env"],
  credentials: true,
}));

const TENANT_SLUG = "shahirizada";
const BLOG_BUCKET = "make-a05c3297-blog-images";
const PRODUCT_BUCKET = "make-a05c3297-product-images";
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD");
if (!ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD environment variable is not set");
}
const BLOG_UPLOAD_LIMIT = 10 * 1024 * 1024;
const PRODUCT_UPLOAD_LIMIT = 10 * 1024 * 1024;

type TenantConfig = {
  timezone?: string | null;
  pickup?: {
    name?: string;
    phone?: string;
    address?: {
      line1: string;
      line2?: string | null;
      city: string;
      state: string;
      zip: string;
      country?: string;
    };
    coordinates?: { lat?: number | null; lng?: number | null };
  };
  loyalty?: {
    earnPerDollar?: number;
  };
  stripe?: {
    publishableKey?: string;
    publishable_key?: string;
    connect_account_id?: string;
    application_fee_bps?: number;
  };
};

type TenantRecord = {
  id: string;
  slug: string;
  name: string;
  default_currency: string;
  stripe_connect_account_id: string | null;
  stripe_application_fee_bps: number | null;
  config: TenantConfig | null;
};

type DeliveryQuoteContext = {
  quoteId: string;
  pickupAddressPayload: string;
  dropoffAddressPayload: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  expiresAt?: string | null;
  createdAt: string;
  environment?: UberMode;
};

let cachedTenant: TenantRecord | null = null;

function normalizePhoneNumber(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // US number: 10 digits (e.g., 7603000080 -> +17603000080)
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // US number with country code: 11 digits starting with 1 (e.g., 17603000080 -> +17603000080)
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  // International number: must have + prefix and be 11-15 digits (e.g., +447123456789)
  if (digits.length >= 11 && digits.length <= 15 && phone.trim().startsWith("+")) {
    return `+${digits}`;
  }
  // Reject invalid phone numbers (< 10 digits like 7-digit local numbers)
  // These cause Uber API to fail with invalid_params error
  return null;
}

// Standard prep window for fresh meat orders
const DEFAULT_PREP_TIME_MINUTES_PROD = 25;
// Use a shorter prep window in test/sandbox so robo courier progresses quickly
const DEFAULT_PREP_TIME_MINUTES_TEST = 3;

function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

type RuntimeEnv = "prod" | "test";

function resolveRequestEnvironment(c: any): RuntimeEnv {
  const headerEnv = c.req.header("x-tabsy-env")?.toLowerCase();
  const origin = c.req.header("origin")?.toLowerCase() ?? "";
  const queryEnv = c.req.query("env")?.toLowerCase();
  const hintedEnv = headerEnv || queryEnv;
  if (hintedEnv === "test") return "test";
  if (origin.includes("test.")) return "test";
  return "prod";
}

function resolveStripeMode(
  runtimeEnv: RuntimeEnv,
  metadataEnv?: string | null
): StripeMode {
  if (metadataEnv && metadataEnv.toLowerCase() === "test") return "test";
  return runtimeEnv === "test" ? "test" : "prod";
}

type ManifestUnitConfig = {
  decimals: number;
  suffix: string;
  isWeight?: boolean;
};

const STRIPE_PUBLISHABLE_KEYS: Record<RuntimeEnv, string[]> = {
  prod: [
    "STRIPE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "VITE_STRIPE_PUBLISHABLE_KEY",
  ],
  test: [
    "STRIPE_TEST_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY",
    "VITE_STRIPE_TEST_PUBLISHABLE_KEY",
  ],
};

function resolveStripePublishableKey(runtimeEnv: RuntimeEnv): string | null {
  const keys = runtimeEnv === "test"
    ? [...STRIPE_PUBLISHABLE_KEYS.test, ...STRIPE_PUBLISHABLE_KEYS.prod]
    : STRIPE_PUBLISHABLE_KEYS.prod;
  for (const key of keys) {
    const value = Deno.env.get(key);
    if (value && `${value}`.trim().length > 0) return value;
  }
  return null;
}

const MANIFEST_UNIT_CONFIG: Record<string, ManifestUnitConfig> = {
  lb: { decimals: 2, suffix: "lb", isWeight: true },
  kg: { decimals: 2, suffix: "kg", isWeight: true },
  oz: { decimals: 1, suffix: "oz", isWeight: true },
  g: { decimals: 0, suffix: "g", isWeight: true },
  each: { decimals: 0, suffix: "" },
  pack: { decimals: 0, suffix: "pack" },
  dozen: { decimals: 0, suffix: "dozen" },
};

const FALLBACK_UNIT_DECIMALS = 2;

function normalizeManifestUnit(unit: unknown): string | null {
  if (typeof unit !== "string") return null;
  const trimmed = unit.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}

function trimDecimalZeros(value: string): string {
  if (!value.includes(".")) return value;
  return value.replace(/\.0+$/, "").replace(/(\.[0-9]*?)0+$/, "$1");
}

type StatusSchedule = Record<string, string>;

const STATUS_FLOW: Record<"pickup" | "delivery", string[]> = {
  pickup: ["created", "accepted", "in_kitchen", "ready", "delivered"],
  delivery: [
    "created",
    "accepted",
    "in_kitchen",
    "ready",
    "courier_requested",
    "driver_en_route",
    "picked_up",
    "delivered",
  ],
};

const STATUS_COPY: Record<
  string,
  { title: string; detail: string; pickupDetail?: string; deliveryDetail?: string }
> = {
  accepted: {
    title: "Order Confirmed",
    detail: "Your order was confirmed",
  },
  in_kitchen: {
    title: "Preparing",
    detail: "Your order is being prepared",
  },
  ready: {
    title: "Ready",
    detail: "Order is ready",
    pickupDetail: "Your order is ready for pickup",
    deliveryDetail: "Order is ready for courier handoff",
  },
  courier_requested: {
    title: "Courier Requested",
    detail: "We're dispatching a courier",
  },
  driver_en_route: {
    title: "Driver En Route",
    detail: "Driver is heading to the store",
  },
  picked_up: {
    title: "Out for Delivery",
    detail: "Driver has picked up your order",
  },
  delivered: {
    title: "Delivered",
    detail: "Order completed",
    pickupDetail: "Order picked up",
    deliveryDetail: "Order delivered",
  },
};

function buildStatusSchedule(params: {
  fulfillment: "pickup" | "delivery";
  environment: string;
  createdAt: string;
  pickupEta?: string | null;
  deliveryEta?: string | null;
}): StatusSchedule {
  const isFast = params.environment === "local" || params.environment === "development" || params.environment === "test";
  const base = Date.parse(params.createdAt);
  const addMinutesFromBase = (mins: number) => new Date(base + mins * 60_000).toISOString();

  const prepStartMinutes = isFast ? 0.5 : 5;
  const readyMinutes = isFast ? DEFAULT_PREP_TIME_MINUTES_TEST : DEFAULT_PREP_TIME_MINUTES_PROD;
  const handoffMinutes = isFast ? 1 : 8;
  const deliveryDriverMinutes = isFast ? 2 : 10;
  const deliveryCompleteMinutes = isFast ? 6 : 35;

  const readyOverride = params.fulfillment === "pickup" ? params.pickupEta : params.deliveryEta;
  const readyIso = readyOverride ?? addMinutesFromBase(readyMinutes);
  const readyTs = Date.parse(readyIso);
  const readyAnchor = Number.isFinite(readyTs) ? readyTs : base;
  const addMinutesFromReady = (mins: number) => new Date(readyAnchor + mins * 60_000).toISOString();

  const schedule: StatusSchedule = {
    accepted: addMinutesFromBase(0.1),
    in_kitchen: addMinutesFromBase(prepStartMinutes),
    ready: readyIso,
  };

  if (params.fulfillment === "pickup") {
    // Pickup completion (picked up) is admin-driven; don't auto-complete.
  } else {
    schedule.courier_requested = addMinutesFromReady(1);
    schedule.driver_en_route = addMinutesFromReady(deliveryDriverMinutes);
    schedule.picked_up = addMinutesFromReady(deliveryDriverMinutes + handoffMinutes);
    schedule.delivered = addMinutesFromReady(deliveryCompleteMinutes);
  }

  return schedule;
}

async function ensureStatusSchedule(
  tenantId: string,
  orderRow: any,
  environment: string
): Promise<{ schedule: StatusSchedule; order: any }> {
  const existingSchedule: StatusSchedule | undefined = orderRow.metadata?.status_schedule;
  if (existingSchedule) {
    return { schedule: existingSchedule, order: orderRow };
  }

  const schedule = buildStatusSchedule({
    fulfillment: orderRow.fulfillment_type === "delivery" ? "delivery" : "pickup",
    environment,
    createdAt: orderRow.created_at,
    pickupEta: orderRow.pickup_eta,
    deliveryEta: orderRow.delivery_eta,
  });

  const { data: updatedOrder } = await supabase
    .from("orders")
    .update({
      metadata: {
        ...(orderRow.metadata ?? {}),
        status_schedule: schedule,
      },
      updated_at: nowIso(),
    })
    .eq("id", orderRow.id)
    .select(ORDER_SELECT)
    .single();

  return { schedule, order: updatedOrder ?? orderRow };
}

// Make sure Uber Direct knows when the kitchen finishes prep, even if status jumped ahead
async function ensureUberPickupReadyNotification(
  order: any,
  schedule: StatusSchedule,
  environment: string
): Promise<any> {
  if (order.fulfillment_type !== "delivery") return order;

  const readyAt = schedule.ready ? Date.parse(schedule.ready) : NaN;
  if (!Number.isFinite(readyAt) || readyAt > Date.now()) return order;

  const alreadyNotified = order.metadata?.courier?.pickup_ready_notified_at;
  if (alreadyNotified) return order;

  const { data: courierTask } = await supabase
    .from("courier_tasks")
    .select("delivery_id, live_mode")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!courierTask?.delivery_id) {
    console.log(`ℹ️ Order ${order.id} reached ready window but no Uber delivery was found`);
    return order;
  }

  const uberMode: UberMode = courierTask.live_mode === false || environment === "test" ? "test" : "prod";
  console.log(`📦 Order ${order.id} ready window reached - notifying Uber Direct (delivery: ${courierTask.delivery_id}, mode: ${uberMode})`);

  const result = await updateUberPickupReady(courierTask.delivery_id, uberMode);
  if (!result.success) {
    console.warn(`⚠️ Failed to notify Uber that order ${order.id} is ready: ${result.error}`);
    return order;
  }

  const updatedMetadata = {
    ...(order.metadata ?? {}),
    courier: {
      ...(order.metadata?.courier ?? {}),
      pickup_ready_notified_at: nowIso(),
      deliveryId: order.metadata?.courier?.deliveryId ?? courierTask.delivery_id,
    },
  };

  const { error: metadataError } = await supabase
    .from("orders")
    .update({
      metadata: updatedMetadata,
      updated_at: nowIso(),
    })
    .eq("id", order.id);

  if (metadataError) {
    console.warn(`⚠️ Failed to record Uber ready notification on order ${order.id}:`, metadataError.message);
    return order;
  }

  return { ...order, metadata: updatedMetadata };
}

function getNextDueStatus(
  fulfillment: "pickup" | "delivery",
  currentStatus: string,
  schedule: StatusSchedule
): string | null {
  const flow = STATUS_FLOW[fulfillment];
  const currentIndex = flow.indexOf(currentStatus);
  if (currentIndex < 0) return null;
  const now = Date.now();

  // For delivery orders, cron ONLY handles statuses up to "ready"
  // After "ready", Uber webhooks handle: courier_requested → driver_en_route → picked_up → delivered
  const CRON_MANAGED_DELIVERY_STATUSES = ["accepted", "in_kitchen", "ready"];

  for (let i = currentIndex + 1; i < flow.length; i++) {
    const status = flow[i];

    // For delivery, skip statuses that Uber webhooks should manage
    if (fulfillment === "delivery" && !CRON_MANAGED_DELIVERY_STATUSES.includes(status)) {
      continue;
    }

    const scheduledAt = schedule[status];
    if (scheduledAt && Date.parse(scheduledAt) <= now) {
      return status;
    }
  }
  return null;
}

async function applyStatusUpdate(params: {
  tenant: TenantRecord;
  order: any;
  nextStatus: string;
}): Promise<any> {
  const { tenant, order, nextStatus } = params;
  const fulfillment = order.fulfillment_type === "delivery" ? "delivery" : "pickup";
  const copy = STATUS_COPY[nextStatus] ?? { title: "Order Updated", detail: nextStatus };
  const detail =
    fulfillment === "pickup"
      ? copy.pickupDetail ?? copy.detail
      : copy.deliveryDetail ?? copy.detail;

  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update({
      status: nextStatus as any,
      updated_at: nowIso(),
    })
    .eq("id", order.id)
    .select(ORDER_SELECT)
    .single();

  if (updateError) {
    console.error("❌ Failed to update order status:", updateError);
    return order;
  }

  let refreshedOrder = updatedOrder ?? order;

  await supabase.from("order_events").insert({
    order_id: refreshedOrder.id,
    tenant_id: tenant.id,
    status: nextStatus as any,
    title: copy.title,
    detail,
    actor: "system",
  });

  // When order status changes to "ready" and it's a delivery order, notify Uber Direct
  if (nextStatus === "ready" && fulfillment === "delivery") {
    try {
      const alreadyNotified = refreshedOrder.metadata?.courier?.pickup_ready_notified_at;
      if (alreadyNotified) {
        console.log(`ℹ️ Order ${refreshedOrder.id} already notified Uber of readiness at ${alreadyNotified}`);
      } else {
        // Get the courier task to find the delivery_id
        const { data: courierTask } = await supabase
          .from("courier_tasks")
          .select("delivery_id, live_mode")
          .eq("order_id", refreshedOrder.id)
          .maybeSingle();

        if (courierTask?.delivery_id) {
          const uberMode: UberMode = courierTask.live_mode === false ? "test" : "prod";
          console.log(`📦 Order ${refreshedOrder.id} is ready - notifying Uber Direct (delivery: ${courierTask.delivery_id}, mode: ${uberMode})`);

          const result = await updateUberPickupReady(courierTask.delivery_id, uberMode);
          if (result.success) {
            console.log(`✅ Uber notified: order ${refreshedOrder.id} is ready for pickup`);

            const updatedMetadata = {
              ...(refreshedOrder.metadata ?? {}),
              courier: {
                ...(refreshedOrder.metadata?.courier ?? {}),
                pickup_ready_notified_at: nowIso(),
                deliveryId: refreshedOrder.metadata?.courier?.deliveryId ?? courierTask.delivery_id,
              },
            };

            const { error: readyMetaError } = await supabase
              .from("orders")
              .update({
                metadata: updatedMetadata,
                updated_at: nowIso(),
              })
              .eq("id", refreshedOrder.id);

            if (readyMetaError) {
              console.warn(`⚠️ Failed to persist ready notification metadata for order ${refreshedOrder.id}:`, readyMetaError.message);
            } else {
              refreshedOrder = { ...refreshedOrder, metadata: updatedMetadata };
            }
          } else {
            console.warn(`⚠️ Failed to notify Uber that order is ready: ${result.error}`);
          }
        } else {
          console.log(`ℹ️ Order ${refreshedOrder.id} marked ready but no Uber delivery found (may be non-Uber delivery)`);
        }
      }
    } catch (uberError: any) {
      console.error(`❌ Error notifying Uber of ready status:`, uberError);
      // Don't fail the status update if Uber notification fails
    }

    // Check if Uber already dispatched a courier (webhook may have fired early while order was in_kitchen)
    // If so, immediately progress to courier_requested now that order is ready
    try {
      const { data: courierTaskForStatus } = await supabase
        .from("courier_tasks")
        .select("status")
        .eq("order_id", refreshedOrder.id)
        .maybeSingle();

      if (courierTaskForStatus?.status === "dispatching") {
        console.log(`📦 Order ${refreshedOrder.id} is ready and courier already dispatched - progressing to courier_requested`);
        // Recursively call to progress to courier_requested
        refreshedOrder = await applyStatusUpdate({
          tenant,
          order: refreshedOrder,
          nextStatus: "courier_requested",
        });
        // Return early since we've already done the next status update
        return refreshedOrder;
      }
    } catch (courierCheckError: any) {
      console.warn(`⚠️ Error checking courier status:`, courierCheckError);
      // Continue with normal flow if check fails
    }
  }

  const customerPhone = refreshedOrder.contact_phone;
  const customerEmail = refreshedOrder.contact_email;
  const customerName = refreshedOrder.contact_name || "Customer";
  const orderNumber = refreshedOrder.order_number?.toString() || refreshedOrder.id?.slice(-6);
  // Prioritize tenant config phone over env var for merchant notifications
  const merchantPhone = tenant.config?.pickup?.phone || Deno.env.get("MERCHANT_PHONE_NUMBER") || "";
  const merchantName = tenant.name ?? "Shahirizada Fresh Market";
  const fulfillmentType = refreshedOrder.fulfillment_type === "delivery" ? "delivery" : "pickup";
  const etaIso = fulfillmentType === "delivery"
    ? refreshedOrder.delivery_eta
    : refreshedOrder.pickup_eta;
  const trackingUrl =
    refreshedOrder.metadata?.courier?.trackingUrl ||
    refreshedOrder.metadata?.courier?.tracking_url ||
    refreshedOrder.metadata?.tracking_url ||
    undefined;

  if (customerPhone || customerEmail || merchantPhone) {
    try {
      await sendStatusUpdate({
        customerPhone: customerPhone || "",
        customerEmail: customerEmail || undefined,
        customerName,
        merchantPhone,
        orderNumber: orderNumber || "N/A",
        status: nextStatus,
        statusTitle: copy.title,
        statusDetail: detail,
        merchantName,
        courierName: refreshedOrder.metadata?.courier?.courier?.name,
        trackingUrl,
      });
    } catch (notifyError) {
      console.warn("⚠️ Status update notification failed", notifyError);
    }
  }

  try {
    await sendOrderStatusPushForOrder({
      orderId: refreshedOrder.id,
      orderNumber: orderNumber || undefined,
      status: nextStatus,
      fulfillmentType,
      etaIso,
      customerId: refreshedOrder.customer_id ?? null,
    });
  } catch (pushError) {
    console.warn("Push notification failed", pushError);
  }

  // Send OneSignal Live Activity update (for iOS lock screen widget)
  if (isOneSignalConfigured()) {
    try {
      await updateLiveActivity({
        activityId: refreshedOrder.id,
        orderId: refreshedOrder.id,
        status: nextStatus,
        fulfillment: fulfillment as "pickup" | "delivery",
        eta: etaIso || undefined,
        courierName: refreshedOrder.metadata?.courier?.courier?.name,
        trackingUrl,
      });
    } catch (liveActivityError) {
      console.warn("⚠️ Live Activity update failed", liveActivityError);
    }
  }

  return refreshedOrder;
}

async function autoProgressOrderStatuses(
  tenant: TenantRecord,
  orderRow: any,
  environment: string
): Promise<any> {
  const fulfillment = orderRow.fulfillment_type === "delivery" ? "delivery" : "pickup";
  const { schedule, order } = await ensureStatusSchedule(tenant.id, orderRow, environment);
  let working = order;

  // If Uber marked the order as courier_requested before our schedule hits "ready",
  // still send the pickup_ready_dt update once prep time has elapsed.
  if (fulfillment === "delivery") {
    const maybeUpdated = await ensureUberPickupReadyNotification(working, schedule, environment);
    if (maybeUpdated) working = maybeUpdated;
  }

  while (true) {
    const nextStatus = getNextDueStatus(fulfillment, working.status, schedule);
    if (!nextStatus) break;
    working = await applyStatusUpdate({ tenant, order: working, nextStatus });
  }

  return working;
}

function scheduleStatusTimers(
  tenant: TenantRecord,
  order: any,
  schedule: StatusSchedule
) {
  const fulfillment = order.fulfillment_type === "delivery" ? "delivery" : "pickup";
  const flow = STATUS_FLOW[fulfillment];
  const now = Date.now();

  flow.forEach((status) => {
    const at = schedule[status];
    if (!at) return;
    const delay = Date.parse(at) - now;
    if (!Number.isFinite(delay) || delay <= 0) return;
    const cappedDelay = Math.min(delay, 2 * 60 * 60 * 1000); // cap at 2h to avoid runaway timers

    setTimeout(async () => {
      try {
        const { data: latest } = await supabase
          .from("orders")
          .select(ORDER_SELECT)
          .eq("id", order.id)
          .eq("tenant_id", tenant.id)
          .maybeSingle();

        if (!latest) return;
        const currentIndex = flow.indexOf(latest.status);
        const targetIndex = flow.indexOf(status);
        if (currentIndex === -1 || targetIndex === -1) return;
        if (currentIndex >= targetIndex) return;

        await applyStatusUpdate({ tenant, order: latest, nextStatus: status });
      } catch (timerError) {
        console.warn("⚠️ Background status timer failed", { orderId: order.id, status, timerError });
      }
    }, cappedDelay);
  });
}

function roundToDecimals(value: number, decimals: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  if (decimals <= 0) return Math.round(value);
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatNormalizedQuantity(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return "";
  if (decimals <= 0) return value.toString();
  return trimDecimalZeros(value.toFixed(decimals));
}

function buildQuantityDescriptor(
  value: number,
  decimals: number,
  config: ManifestUnitConfig | null,
  unitLabel: unknown,
): string {
  const formatted = formatNormalizedQuantity(value, decimals);
  if (config?.suffix) {
    return config.suffix ? `${formatted} ${config.suffix}`.trim() : formatted;
  }
  if (typeof unitLabel === "string") {
    const trimmed = unitLabel.trim();
    if (trimmed.length) {
      return `${formatted} ${trimmed}`.trim();
    }
  }
  return formatted;
}

function computeManifestQuantityInfo(item: any) {
  const qty = Number(item?.qty ?? 0);
  const unitKey = normalizeManifestUnit(item?.unit);
  const config = unitKey ? MANIFEST_UNIT_CONFIG[unitKey] ?? null : null;
  const decimals = config?.decimals ?? (unitKey ? FALLBACK_UNIT_DECIMALS : 0);
  const normalizedQuantity = roundToDecimals(qty, decimals);
  const providedDisplay =
    typeof item?.quantityDisplay === "string" ? item.quantityDisplay.trim() : "";
  const descriptor = providedDisplay.length
    ? providedDisplay
    : Number.isFinite(qty) && qty > 0
      ? buildQuantityDescriptor(normalizedQuantity, decimals, config, item?.unitLabel)
      : null;
  const summaryLabel = descriptor ?? formatNormalizedQuantity(normalizedQuantity, decimals);
  const shouldAnnotate = Boolean(
    descriptor &&
    (
      config?.isWeight ||
      descriptor.includes(".") ||
      /[a-zA-Z]/.test(descriptor)
    ),
  );

  return {
    descriptor,
    normalizedQuantity,
    summaryLabel,
    shouldAnnotate,
  };
}

async function getTenant(): Promise<TenantRecord> {
  if (cachedTenant) return cachedTenant;

  console.log("Looking for tenant with slug:", TENANT_SLUG);
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", TENANT_SLUG)
    .maybeSingle();

  console.log("Tenant query result:", { data: !!data, error: error?.message });
  if (error || !data) {
    console.error("Tenant lookup failed:", error?.message || "No data returned");
    throw new Error("Tenant not configured");
  }

  const config = (data.config ?? null) as TenantConfig | null;
  const fallbackStripe = config?.stripe ?? {};
  const envConnectAccountId = getEnv(["STRIPE_CONNECT_ACCOUNT_ID"]) || null;

  const normalized: TenantRecord = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    default_currency: (data.default_currency ?? data.currency ?? "USD") || "USD",
    stripe_connect_account_id:
      data.stripe_connect_account_id ??
      fallbackStripe.connect_account_id ??
      envConnectAccountId,
    stripe_application_fee_bps: Number(
      data.stripe_application_fee_bps ??
      fallbackStripe.application_fee_bps ??
      0,
    ),
    config,
  };

  cachedTenant = normalized;
  return normalized;
}

function getPickupDetailsFromTenant(tenant: TenantRecord) {
  console.log("📦 getPickupDetailsFromTenant called", {
    hasConfig: !!tenant.config,
    configKeys: tenant.config ? Object.keys(tenant.config) : [],
    hasPickup: !!tenant.config?.pickup,
    pickupKeys: tenant.config?.pickup ? Object.keys(tenant.config.pickup) : [],
    hasAddress: !!tenant.config?.pickup?.address,
  });
  const pickup = tenant.config?.pickup;
  if (!pickup?.address) {
    console.error("❌ Tenant pickup address missing", {
      config: JSON.stringify(tenant.config),
    });
    throw new Error("Tenant pickup address not configured");
  }
  if (!pickup.phone) {
    throw new Error("Tenant pickup phone not configured");
  }
  const normalizedPhone = normalizePhoneNumber(pickup.phone);
  if (!normalizedPhone) {
    throw new Error("Tenant pickup phone is invalid. Please configure a valid phone number with country code.");
  }
  return {
    name: pickup.name ?? tenant.name,
    phone: normalizedPhone,
    address: {
      line1: pickup.address.line1,
      line2: pickup.address.line2 ?? null,
      city: pickup.address.city,
      state: pickup.address.state,
      zip: pickup.address.zip,
      country: pickup.address.country ?? "US",
    },
    latitude: pickup.coordinates?.lat ?? null,
    longitude: pickup.coordinates?.lng ?? null,
  };
}

async function createSession() {
  const id = crypto.randomUUID();
  await kv.set(`admin_session:${id}`, { expiry: Date.now() + 12 * 60 * 60 * 1000, createdAt: nowIso() });
  return id;
}

async function getSessionInfo(c: any): Promise<SessionInfo> {
  const cookie = c.req.header("Cookie") ?? "";
  const match = cookie.match(/admin_session=([^;]+)/);
  if (!match) return { hasCookie: false, sessionId: null, session: null };
  const sessionId = match[1];
  const session = await kv.get(`admin_session:${sessionId}`);
  if (!session) return { hasCookie: true, sessionId: null, session: null };
  if (session.expiry && session.expiry < Date.now()) {
    await kv.del(`admin_session:${sessionId}`);
    return { hasCookie: true, sessionId: null, session: null };
  }
  return { hasCookie: true, sessionId, session };
}

async function requireAdmin(c: any) {
  const info = await getSessionInfo(c);
  if (!info.session) {
    return { ok: false, response: c.json({ error: "Unauthorized" }, 401) };
  }
  return { ok: true };
}

function extractBearerToken(c: any): string | null {
  const header = c.req.header("authorization") ?? c.req.header("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function hasAdminRole(user: SupabaseAuthUser | null): boolean {
  if (!user) return false;
  const appRole = (user.app_metadata as any)?.role ?? (user.app_metadata as any)?.roles;
  const userRole = (user.user_metadata as any)?.role ?? (user.user_metadata as any)?.roles;
  const roles = [
    ...(Array.isArray(appRole) ? appRole : appRole ? [appRole] : []),
    ...(Array.isArray(userRole) ? userRole : userRole ? [userRole] : []),
  ]
    .flat()
    .filter(Boolean)
    .map((r) => (typeof r === "string" ? r.toLowerCase() : ""));
  return roles.includes("admin");
}

async function requireSupabaseAdmin(c: any) {
  const token = extractBearerToken(c);
  if (!token) {
    return { ok: false, response: c.json({ error: "Missing auth token" }, 401) };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, response: c.json({ error: "Unauthorized" }, 401) };
  }

  const isAdmin = hasAdminRole(data.user as SupabaseAuthUser);
  if (!isAdmin) {
    return { ok: false, response: c.json({ error: "Forbidden" }, 403) };
  }

  return { ok: true, user: data.user as SupabaseAuthUser, token };
}

async function getTenantId(): Promise<string> {
  const tenant = await getTenant();
  return tenant.id;
}

async function ensureCustomer(
  tenantId: string,
  info: { firstName?: string; lastName?: string; email?: string; phone?: string },
) {
  // Get the authenticated user (if any)
  const { data: { user } } = await supabase.auth.getUser();
  const authUserId = user?.id ?? null;

  const normalizedEmail = normalizeEmail(info.email);
  const inputPhone = info.phone?.trim() ?? null;
  // Use 10-digit format for consistent storage/lookup (matches loyalty_profiles)
  const normalizedPhone = normalizePhone(inputPhone);
  const trimmedFirstName = info.firstName?.trim() || null;
  const trimmedLastName = info.lastName?.trim() || null;
  // Search using normalized 10-digit phone
  const phoneSearchValues = normalizedPhone ? [normalizedPhone] : [];

  const maybeUpdateCustomer = async (customer: any, matchedByEmail: boolean) => {
    const updates: Record<string, any> = {};

    // Link auth_user_id if authenticated and not already linked
    if (authUserId && !customer.auth_user_id) {
      updates.auth_user_id = authUserId;
    }

    // When matched by email (primary key), ALWAYS override contact info
    // This ensures the latest checkout info is saved for this email
    if (matchedByEmail) {
      // Always update first_name if provided (override)
      if (trimmedFirstName && trimmedFirstName !== customer.first_name) {
        updates.first_name = trimmedFirstName;
      }
      // Always update last_name if provided (override)
      if (trimmedLastName && trimmedLastName !== customer.last_name) {
        updates.last_name = trimmedLastName;
      }
      // Always update phone if provided (override) - clear old customer's phone if conflict
      if (normalizedPhone && customer.phone !== normalizedPhone) {
        // Clear phone from any other customer that has it (email is primary key)
        await supabase
          .from("customers")
          .update({ phone: null, updated_at: nowIso() })
          .eq("tenant_id", tenantId)
          .eq("phone", normalizedPhone)
          .neq("id", customer.id);
        updates.phone = normalizedPhone;
      }
    } else {
      // Matched by phone - be more careful with updates
      if (trimmedFirstName && trimmedFirstName !== customer.first_name) {
        updates.first_name = trimmedFirstName;
      }
      if (trimmedLastName && trimmedLastName !== customer.last_name) {
        updates.last_name = trimmedLastName;
      }
      // Only update email if it's not already taken by another customer
      if (normalizedEmail && customer.email?.toLowerCase?.() !== normalizedEmail) {
        const { data: conflict } = await supabase
          .from("customers")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("email", normalizedEmail)
          .neq("id", customer.id)
          .maybeSingle();

        if (!conflict) {
          updates.email = normalizedEmail;
        } else {
          console.warn(`Skipping customer email update: ${normalizedEmail} is already in use by another customer.`);
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      const { data } = await supabase
        .from("customers")
        .update({ ...updates, updated_at: nowIso() })
        .eq("id", customer.id)
        .select("*")
        .single();
      return data ?? { ...customer, ...updates };
    }
    return customer;
  };

  // Try to find by email first (case-insensitive) - EMAIL IS PRIMARY KEY
  if (normalizedEmail) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (data) {
      // Email match: always override contact info (first_name, last_name, phone)
      return maybeUpdateCustomer(data, true);
    }
  }

  // No email match - check if we should search by phone (only if no email provided)
  // If email IS provided but not found, we create a new customer for this email
  // (don't reuse existing customer just because phone matches - email is primary identity)
  if (!normalizedEmail) {
    for (const phone of phoneSearchValues) {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("phone", phone)
        .maybeSingle();
      if (data) {
        // Phone match (no email provided): update this customer
        return maybeUpdateCustomer(data, false);
      }
    }
  }

  // Create new customer - steal phone from any existing customer first
  if (normalizedPhone) {
    const { data: phoneConflict } = await supabase
      .from("customers")
      .select("id, email")
      .eq("tenant_id", tenantId)
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (phoneConflict) {
      console.warn(`Stealing phone ${normalizedPhone} from customer ${phoneConflict.id} (${phoneConflict.email}) → new customer for ${normalizedEmail}`);
      await supabase
        .from("customers")
        .update({ phone: null, updated_at: nowIso() })
        .eq("id", phoneConflict.id);
    }
  }

  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      tenant_id: tenantId,
      auth_user_id: authUserId,
      first_name: trimmedFirstName ?? "",
      last_name: trimmedLastName ?? "",
      email: normalizedEmail,
      phone: normalizedPhone, // Always use 10-digit normalized format
    })
    .select("*")
    .single();
  if (error || !created) throw new Error("Failed to create customer");
  return created;
}

async function createDeliveryAddress(
  tenantId: string,
  customerId: string | null,
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    instructions?: string;
    latitude?: number;
    longitude?: number;
  },
) {
  if (!address?.line1) return null;
  const { data, error } = await supabase
    .from("addresses")
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      street_line1: address.line1,
      street_line2: address.line2,
      city: address.city,
      state: address.state,
      postal_code: address.zip,
      delivery_instructions: address.instructions,
      latitude: address.latitude,
      longitude: address.longitude,
      is_default: false,
    })
    .select("*")
    .single();
  if (error) throw new Error("Failed to store address");
  return data;
}

type LoyaltyProfileRow = {
  id: string;
  email: string | null;
  email_normalized: string | null;
  phone: string | null;
  phone_normalized: string | null;
  name: string | null;
  stars: number;
  referral_code: string;
  first_order_completed: boolean;
};

type LoyaltySummary = {
  profileId: string;
  starsEarned: number;
  newBalance: number;
  referralCode?: string | null;
  awardedAt: string;
};

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

/**
 * Normalize phone to 10-digit US format for consistent storage and lookup.
 * Strips country code (1) if present to ensure +17732170707 and 7732170707 match.
 */
function normalizePhone(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return null;
  // Strip leading 1 for US numbers to get consistent 10-digit format
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  // Already 10 digits
  if (digits.length === 10) {
    return digits;
  }
  // For other formats, return as-is (international numbers)
  return digits;
}

async function findLoyaltyProfile(
  tenantId: string,
  identifier: { email?: string | null; phone?: string | null },
): Promise<LoyaltyProfileRow | null> {
  const normalizedEmail = normalizeEmail(identifier.email);
  // Email is primary identity - always search by email first
  if (normalizedEmail) {
    const { data } = await supabase
      .from("loyalty_profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("email_normalized", normalizedEmail)
      .maybeSingle();
    if (data) return data as LoyaltyProfileRow;
    // Email provided but not found - return null (will create new profile)
    // Don't fall back to phone search - email is the primary identity
    return null;
  }

  // Only search by phone if NO email was provided
  const normalizedPhone = normalizePhone(identifier.phone);
  if (normalizedPhone) {
    const { data } = await supabase
      .from("loyalty_profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("phone_normalized", normalizedPhone)
      .maybeSingle();
    if (data) return data as LoyaltyProfileRow;
  }

  return null;
}

async function generateReferralCode(): Promise<string> {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  while (true) {
    const code = Array.from({ length: 8 })
      .map(() => alphabet[Math.floor(Math.random() * alphabet.length)])
      .join("");
    const { data } = await supabase
      .from("loyalty_profiles")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (!data) return code;
  }
}

async function ensureLoyaltyProfile(
  tenantId: string,
  info: { email?: string | null; phone?: string | null; name?: string | null },
): Promise<LoyaltyProfileRow> {
  const existing = await findLoyaltyProfile(tenantId, info);
  const normalizedEmail = normalizeEmail(info.email);
  const normalizedPhone = normalizePhone(info.phone);
  const trimmedName = info.name?.trim() || null;

  if (existing) {
    const updates: Record<string, string | null> = {};
    if (trimmedName && trimmedName !== existing.name) {
      updates.name = trimmedName;
    }

    // Only update email if it's not already taken
    if (normalizedEmail && normalizedEmail !== existing.email_normalized) {
      const { data: conflict } = await supabase
        .from("loyalty_profiles")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("email_normalized", normalizedEmail)
        .neq("id", existing.id)
        .maybeSingle();

      if (!conflict) {
        updates.email = info.email?.trim() ?? null;
        updates.email_normalized = normalizedEmail;
      } else {
        console.warn(`Skipping loyalty profile email update: ${normalizedEmail} is already in use.`);
      }
    } else if (!existing.email && info.email?.trim()) {
      // Case where existing has no email, but we want to add one.
      // We still need to check if it's taken (though findLoyaltyProfile should have found it if it was)
      // But findLoyaltyProfile checks email first, so if we are here, it means we found by PHONE.
      // So the email MIGHT exist on another profile.
      if (normalizedEmail) {
        const { data: conflict } = await supabase
          .from("loyalty_profiles")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("email_normalized", normalizedEmail)
          .neq("id", existing.id)
          .maybeSingle();

        if (!conflict) {
          updates.email = info.email.trim();
          updates.email_normalized = normalizedEmail;
        } else {
          console.warn(`Skipping loyalty profile email add: ${normalizedEmail} is already in use.`);
        }
      }
    }

    // Update phone - steal from other profile if necessary (phone must be unique for login)
    if (normalizedPhone && normalizedPhone !== existing.phone_normalized) {
      // Clear phone from any other profile that has it
      const { data: conflict } = await supabase
        .from("loyalty_profiles")
        .select("id, email")
        .eq("tenant_id", tenantId)
        .eq("phone_normalized", normalizedPhone)
        .neq("id", existing.id)
        .maybeSingle();

      if (conflict) {
        console.warn(`Stealing phone ${normalizedPhone} from loyalty profile ${conflict.id} (${conflict.email}) → giving to ${existing.id} (${existing.email})`);
        await supabase
          .from("loyalty_profiles")
          .update({ phone: null, phone_normalized: null, updated_at: nowIso() })
          .eq("id", conflict.id);
      }
      updates.phone = info.phone?.trim() ?? null;
      updates.phone_normalized = normalizedPhone;
    } else if (!existing.phone && info.phone?.trim() && normalizedPhone) {
      // Found by email, adding phone. Steal if exists elsewhere.
      const { data: conflict } = await supabase
        .from("loyalty_profiles")
        .select("id, email")
        .eq("tenant_id", tenantId)
        .eq("phone_normalized", normalizedPhone)
        .neq("id", existing.id)
        .maybeSingle();

      if (conflict) {
        console.warn(`Stealing phone ${normalizedPhone} from loyalty profile ${conflict.id} (${conflict.email}) → giving to ${existing.id} (${existing.email})`);
        await supabase
          .from("loyalty_profiles")
          .update({ phone: null, phone_normalized: null, updated_at: nowIso() })
          .eq("id", conflict.id);
      }
      updates.phone = info.phone.trim();
      updates.phone_normalized = normalizedPhone;
    }

    if (Object.keys(updates).length > 0) {
      const { data } = await supabase
        .from("loyalty_profiles")
        .update({ ...updates, updated_at: nowIso() })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (data) {
        return data as LoyaltyProfileRow;
      }
      return { ...existing, ...updates } as LoyaltyProfileRow;
    }

    return existing;
  }

  // Creating new profile - steal phone from any existing profile first
  if (normalizedPhone) {
    const { data: conflict } = await supabase
      .from("loyalty_profiles")
      .select("id, email")
      .eq("tenant_id", tenantId)
      .eq("phone_normalized", normalizedPhone)
      .maybeSingle();

    if (conflict) {
      console.warn(`Stealing phone ${normalizedPhone} from loyalty profile ${conflict.id} (${conflict.email}) → new profile for ${normalizedEmail}`);
      await supabase
        .from("loyalty_profiles")
        .update({ phone: null, phone_normalized: null, updated_at: nowIso() })
        .eq("id", conflict.id);
    }
  }

  const referralCode = await generateReferralCode();
  const { data, error } = await supabase
    .from("loyalty_profiles")
    .insert({
      tenant_id: tenantId,
      email: info.email?.trim() ?? null,
      email_normalized: normalizedEmail,
      phone: info.phone?.trim() ?? null,
      phone_normalized: normalizedPhone,
      name: trimmedName,
      referral_code: referralCode,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(error?.message || "Failed to create loyalty profile");
  }
  return data as LoyaltyProfileRow;
}

async function recordLoyaltyEvent(params: {
  tenantId: string;
  profileId: string;
  orderId: string;
  stars: number;
  description: string;
  type?: "purchase" | "cancellation" | "adjustment" | "redemption" | "referral";
}) {
  await supabase.from("loyalty_events").insert({
    tenant_id: params.tenantId,
    profile_id: params.profileId,
    order_id: params.orderId,
    type: params.type ?? "purchase",
    stars: params.stars,
    description: params.description,
  });
}

async function awardLoyaltyForOrder(
  tenant: TenantRecord,
  orderRow: any,
  customer: { email?: string; phone?: string; firstName?: string; lastName?: string },
): Promise<LoyaltySummary | null> {
  if (!customer.email && !customer.phone) return null;

  const profile = await ensureLoyaltyProfile(tenant.id, {
    email: customer.email,
    phone: customer.phone,
    name: `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || undefined,
  });

  const earnRate = tenant.config?.loyalty?.earnPerDollar ?? 10;
  const starsEarned = Math.max(0, Math.round(((orderRow.total_cents ?? 0) / 100) * earnRate));

  if (starsEarned <= 0) {
    return {
      profileId: profile.id,
      starsEarned: 0,
      newBalance: profile.stars ?? 0,
      referralCode: profile.referral_code,
      awardedAt: nowIso(),
    };
  }

  const { data: updatedProfile, error } = await supabase
    .from("loyalty_profiles")
    .update({
      stars: (profile.stars ?? 0) + starsEarned,
      first_order_completed: true,
      updated_at: nowIso(),
    })
    .eq("id", profile.id)
    .select("*")
    .single();

  if (error || !updatedProfile) {
    throw new Error(error?.message || "Failed to update loyalty profile");
  }

  await recordLoyaltyEvent({
    tenantId: tenant.id,
    profileId: profile.id,
    orderId: orderRow.id,
    stars: starsEarned,
    description: `Order ${orderRow.order_number ?? orderRow.id}`,
  });

  return {
    profileId: profile.id,
    starsEarned,
    newBalance: updatedProfile.stars ?? (profile.stars ?? 0) + starsEarned,
    referralCode: updatedProfile.referral_code,
    awardedAt: nowIso(),
  };
}

/**
 * Revoke loyalty points when an order is canceled.
 * Finds the loyalty event for the order and subtracts those stars from the profile.
 */
async function revokeLoyaltyForCanceledOrder(
  tenant: TenantRecord,
  orderRow: any,
): Promise<{ starsRevoked: number; newBalance: number } | null> {
  // Find the original loyalty event for this order
  const { data: loyaltyEvent } = await supabase
    .from("loyalty_events")
    .select("id, profile_id, stars")
    .eq("tenant_id", tenant.id)
    .eq("order_id", orderRow.id)
    .eq("type", "purchase")
    .maybeSingle();

  if (!loyaltyEvent || !loyaltyEvent.profile_id || (loyaltyEvent.stars ?? 0) <= 0) {
    console.log(`📦 No loyalty points to revoke for order ${orderRow.id}`);
    return null;
  }

  const starsToRevoke = loyaltyEvent.stars ?? 0;

  // Get the current profile
  const { data: profile } = await supabase
    .from("loyalty_profiles")
    .select("*")
    .eq("id", loyaltyEvent.profile_id)
    .single();

  if (!profile) {
    console.warn(`⚠️ Loyalty profile ${loyaltyEvent.profile_id} not found for revocation`);
    return null;
  }

  // Subtract stars (don't go below 0)
  const newBalance = Math.max(0, (profile.stars ?? 0) - starsToRevoke);

  const { error: updateError } = await supabase
    .from("loyalty_profiles")
    .update({
      stars: newBalance,
      updated_at: nowIso(),
    })
    .eq("id", profile.id);

  if (updateError) {
    console.error(`❌ Failed to revoke loyalty stars:`, updateError);
    return null;
  }

  // Record the revocation event (negative stars)
  await recordLoyaltyEvent({
    tenantId: tenant.id,
    profileId: profile.id,
    orderId: orderRow.id,
    stars: -starsToRevoke,
    description: `Order ${orderRow.order_number ?? orderRow.id} canceled`,
    type: "cancellation",
  });

  console.log(`📦 Revoked ${starsToRevoke} stars for canceled order ${orderRow.id}. New balance: ${newBalance}`);

  return {
    starsRevoked: starsToRevoke,
    newBalance,
  };
}

function serializeLoyaltyProfile(row: LoyaltyProfileRow) {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    name: row.name,
    stars: row.stars ?? 0,
    referralCode: row.referral_code,
    firstOrderCompleted: row.first_order_completed,
  };
}

const ORDER_SELECT = `
  *,
  order_items (*),
  order_events (*),
  delivery_address:delivery_address_id (*)
`;

function formatDeliveryAddress(address: any) {
  if (!address) return null;
  return {
    line1: address.street_line1,
    line2: address.street_line2,
    city: address.city,
    state: address.state,
    postalCode: address.postal_code,
    instructions: address.delivery_instructions,
    latitude: address.latitude,
    longitude: address.longitude,
  };
}

function serializeOrder(row: any) {
  if (!row) return null;
  const events =
    row.order_events?.sort(
      (a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ) ?? [];

  return {
    id: row.id,
    orderNumber: row.order_number,
    shortCode: (row.order_number?.toString().slice(-6) ?? row.id.slice(-6)).toUpperCase(),
    tenantId: row.tenant_id,
    customerId: row.customer_id,
    fulfillmentType: row.fulfillment_type,
    status: row.status,
    paymentStatus: row.payment_status,
    scheduledFor: row.scheduled_for,
    pickupEta: row.pickup_eta,
    deliveryEta: row.delivery_eta,
    contact: {
      name: row.contact_name,
      email: row.contact_email,
      phone: row.contact_phone,
    },
    deliveryAddress: formatDeliveryAddress(row.delivery_address),
    totals: {
      subtotalCents: row.subtotal_cents,
      taxCents: row.tax_cents,
      serviceFeeCents: row.service_fee_cents,
      deliveryFeeCents: row.delivery_fee_cents,
      tipCents: row.tip_cents,
      discountCents: row.discount_cents,
      totalCents: row.total_cents,
    },
    items: (row.order_items ?? []).map((item: any) => ({
      id: item.id,
      sku: item.menu_item_key,
      name: item.name,
      description: item.description,
      imageUrl: item.image_url,
      unitPriceCents: item.unit_price_cents,
      quantity: Number(item.quantity), // Ensure numeric type (PostgreSQL numeric may come as string)
      totalPriceCents: item.total_price_cents,
      modifiers: item.modifiers ?? [],
      note: item.metadata?.note,
      unit: item.metadata?.unit ?? item.unit_label ?? null,
      unitLabel: item.metadata?.unitLabel ?? item.unit_label ?? null,
      quantityDisplay: item.metadata?.quantityDisplay ?? null,
    })),
    events: events.map((evt: any) => ({
      id: evt.id,
      status: evt.status,
      title: evt.title,
      detail: evt.detail,
      actor: evt.actor,
      createdAt: evt.created_at,
    })),
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    posOrderId: row.pos_order_id,
  };
}

async function fetchOrder(tenantId: string, filters: Record<string, string | number>) {
  let query = supabase.from("orders").select(ORDER_SELECT).eq("tenant_id", tenantId);
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value as never);
  });
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

async function refreshCourierStatusIfStale(orderRow: any): Promise<boolean> {
  const activeStatuses = ["courier_requested", "driver_en_route", "picked_up"];
  if (orderRow.fulfillment_type !== "delivery" || !activeStatuses.includes(orderRow.status)) {
    return false;
  }

  const { data: courierTask } = await supabase
    .from("courier_tasks")
    .select("*")
    .eq("order_id", orderRow.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!courierTask || courierTask.provider !== "uber" || !courierTask.delivery_id) {
    return false;
  }

  const deliveryEnv: UberMode =
    (orderRow?.metadata?.deliveryEnvironment ?? orderRow?.metadata?.environment) === "test"
      ? "test"
      : "prod";

  const lastStatusAt = courierTask.last_status_at ? Date.parse(courierTask.last_status_at) : 0;
  // Avoid hammering Uber if we recently refreshed
  if (lastStatusAt && Date.now() - lastStatusAt < 60_000) {
    return false;
  }

  try {
    const status = await getUberDeliveryStatus(courierTask.delivery_id, deliveryEnv);
    const newOrderStatus = mapUberStatusToOrderStatus(status.status as any);
    const newCourierStatus = mapUberToCourierStatus(status.status as any);

    await supabase
      .from("courier_tasks")
      .update({
        status: newCourierStatus as any,
        tracking_url: status.trackingUrl ?? courierTask.tracking_url,
        raw_status: status.raw ?? status,
        last_status_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq("id", courierTask.id);

    if (newOrderStatus !== orderRow.status) {
      await supabase
        .from("orders")
        .update({
          status: newOrderStatus as any,
          delivery_eta: status.dropoffEta ?? orderRow.delivery_eta ?? null,
          updated_at: nowIso(),
        })
        .eq("id", orderRow.id);

      await supabase.from("order_events").insert({
        order_id: orderRow.id,
        tenant_id: orderRow.tenant_id,
        status: newOrderStatus as any,
        title: getUberEventTitle(status.status as any),
        detail: getUberEventDetail(status.status as any, status.courier?.name),
        actor: "system",
        metadata: {
          delivery_id: courierTask.delivery_id,
          tracking_url: status.trackingUrl ?? courierTask.tracking_url,
          courier: status.courier ?? null,
        },
      });
      return true;
    }
  } catch (err) {
    console.error("⚠️ Failed to refresh courier status from Uber", err);
  }

  return false;
}

async function handleBucketUpload(params: StorageUploadParams) {
  return uploadToBucket(supabase, params.bucket, params.file, params.filename ?? params.file.name ?? "upload.png");
}

app.get("/market-server", (c) => c.text("server ok"));
app.get("/market-server/health", (c) => c.json({ ok: true, timestamp: nowIso() }));

// Cron endpoint to progress order statuses - called by pg_cron every minute
app.post("/market-server/cron/progress-orders", async (c) => {
  const cronSecret = c.req.header("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET") || "cron-secret-key";

  // Simple auth check for cron jobs
  if (cronSecret !== expectedSecret) {
    console.warn("⚠️ Cron endpoint called without valid secret");
    return c.json({ error: "Unauthorized" }, 401);
  }

  console.log("⏰ Cron: Starting order status progression check...");

  try {
    // Find orders that are in active status (not terminal states)
    const activeStatuses = ["created", "accepted", "in_kitchen", "ready", "courier_requested", "driver_en_route", "picked_up"];

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        tenant_id,
        status,
        fulfillment_type,
        metadata,
        created_at
      `)
      .in("status", activeStatuses)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Only last 24h
      .order("created_at", { ascending: true })
      .limit(50);

    if (ordersError) {
      console.error("❌ Cron: Failed to fetch orders:", ordersError);
      return c.json({ error: "Failed to fetch orders" }, 500);
    }

    if (!orders || orders.length === 0) {
      console.log("⏰ Cron: No active orders to process");
      return c.json({ processed: 0, message: "No active orders" });
    }

    console.log(`⏰ Cron: Found ${orders.length} active orders to check`);

    let processed = 0;
    let progressed = 0;

    for (const order of orders) {
      try {
        // Get tenant for this order
        const { data: tenant } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", order.tenant_id)
          .single();

        if (!tenant) {
          console.warn(`⚠️ Cron: Tenant not found for order ${order.id}`);
          continue;
        }

        // Determine environment from order metadata
        const environment = order.metadata?.environment || order.metadata?.deliveryEnvironment || "prod";

        // Auto-progress order statuses based on schedule
        const { schedule } = await ensureStatusSchedule(tenant.id, order, environment);
        const fulfillment = order.fulfillment_type === "delivery" ? "delivery" : "pickup";
        const nextStatus = getNextDueStatus(fulfillment, order.status, schedule);

        if (nextStatus) {
          console.log(`⏰ Cron: Progressing order ${order.id} from ${order.status} to ${nextStatus}`);
          await applyStatusUpdate({ tenant, order, nextStatus });
          progressed++;
        }

        processed++;
      } catch (orderError: any) {
        console.error(`❌ Cron: Error processing order ${order.id}:`, orderError.message);
      }
    }

    console.log(`⏰ Cron: Completed. Processed: ${processed}, Progressed: ${progressed}`);
    return c.json({ processed, progressed, timestamp: nowIso() });
  } catch (error: any) {
    console.error("❌ Cron: Unexpected error:", error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/market-server/blog/upload-image", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    const filename = body["filename"];

    if (!(file instanceof File)) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    const finalFilename = typeof filename === "string" ? filename : file.name;
    const url = await handleBucketUpload({
      bucket: BLOG_BUCKET,
      file,
      filename: finalFilename,
    });

    return c.json({ url });
  } catch (error: any) {
    console.error("Blog upload error:", error);
    return c.json({ error: "Failed to upload image" }, 500);
  }
});

app.post("/market-server/admin/product/upload-image", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    const filename = body["filename"];
    const itemId = body["itemId"];

    if (!(file instanceof File)) {
      return c.json({ error: "No file uploaded", success: false }, 400);
    }

    // Generate unique filename with itemId prefix
    const ext = file.name.split(".").pop() || "jpg";
    const sanitizedItemId = typeof itemId === "string" ? itemId.replace(/[^a-zA-Z0-9-_]/g, "") : "product";
    const finalFilename = `${sanitizedItemId}-${Date.now()}.${ext}`;

    const result = await handleBucketUpload({
      bucket: PRODUCT_BUCKET,
      file,
      filename: finalFilename,
    });

    return c.json({ url: result.url, success: true });
  } catch (error: any) {
    console.error("Product image upload error:", error);
    return c.json({ error: "Failed to upload image", success: false }, 500);
  }
});

app.post("/market-server/delivery/quote", async (c) => {
  try {
    const runtimeEnv = resolveRequestEnvironment(c);
    const uberEnv: UberMode = runtimeEnv === "test" ? "test" : "prod";
    if (!isUberConfigured(uberEnv)) {
      return c.json({ error: "Delivery provider unavailable" }, 503);
    }
    const tenant = await getTenant();
    const pickup = getPickupDetailsFromTenant(tenant);
    const payload = await c.req.json();
    const address = payload?.address;
    if (!address?.line1 || !address?.city || !address?.state || !address?.zip) {
      return c.json({ error: "Invalid address" }, 400);
    }
    const dropoff = {
      line1: address.line1.toString().trim(),
      line2: address.line2?.toString() ?? null,
      city: address.city.toString().trim(),
      state: address.state.toString().trim(),
      zip: address.zip.toString().trim(),
      country: (address.country ?? "US").toString().trim(),
    };
    const dropoffLatitude = parseCoordinate(address.latitude);
    const dropoffLongitude = parseCoordinate(address.longitude);

    console.log("🚚 Requesting Uber delivery quote", {
      environment: uberEnv,
      pickup: {
        line1: pickup.address.line1,
        city: pickup.address.city,
        state: pickup.address.state,
        lat: pickup.latitude ?? null,
        lng: pickup.longitude ?? null,
      },
      dropoff: {
        line1: dropoff.line1,
        city: dropoff.city,
        state: dropoff.state,
        lat: dropoffLatitude,
        lng: dropoffLongitude,
      },
    });

    const quote = await quoteUberDelivery(pickup, {
      ...dropoff,
      ...(dropoffLatitude !== null ? { latitude: dropoffLatitude } : {}),
      ...(dropoffLongitude !== null ? { longitude: dropoffLongitude } : {}),
    }, uberEnv);

    const quoteContext: DeliveryQuoteContext = {
      quoteId: quote.quoteId,
      pickupAddressPayload: quote.pickupAddressPayload,
      dropoffAddressPayload: quote.dropoffAddressPayload,
      pickupLatitude: pickup.latitude ?? null,
      pickupLongitude: pickup.longitude ?? null,
      dropoffLatitude,
      dropoffLongitude,
      expiresAt: quote.expiresAt,
      createdAt: nowIso(),
      environment: uberEnv,
    };
    try {
      await kv.set(`delivery_quote:${quote.quoteId}`, quoteContext);
      console.log("🗂️ Stored delivery quote context", {
        quoteId: quote.quoteId,
        pickupLat: quoteContext.pickupLatitude,
        pickupLng: quoteContext.pickupLongitude,
      });
    } catch (err) {
      console.error("❌ Failed to cache delivery quote context", err);
    }

    return c.json({
      quote: {
        provider: "uber",
        quoteId: quote.quoteId,
        feeCents: quote.feeCents,
        currency: quote.currency?.toUpperCase() ?? tenant.default_currency ?? "USD",
        etaMinutes: quote.etaMinutes ?? null,
        expiresAt: quote.expiresAt,
        pickupAddressPayload: quote.pickupAddressPayload,
        dropoffAddressPayload: quote.dropoffAddressPayload,
      },
    });
  } catch (error: any) {
    console.error("Delivery quote error:", error);
    const errorMessage = `Failed to fetch delivery quote: ${error.message}`;
    return c.json({ error: errorMessage }, 502);
  }
});

app.get("/market-server/config", async (c) => {
  try {
    const runtimeEnv = resolveRequestEnvironment(c);
    const tenant = await getTenant();
    const publishableKey =
      resolveStripePublishableKey(runtimeEnv) ||
      tenant.config?.stripe?.publishableKey ||
      tenant.config?.stripe?.publishable_key ||
      null;

    return c.json({
      name: tenant.name,
      currency: tenant.default_currency ?? "USD",
      stripe: publishableKey ? {
        publishableKey,
        connectAccountId:
          runtimeEnv === "test"
            ? (Deno.env.get("STRIPE_TEST_CONNECT_ACCOUNT_ID") || tenant.stripe_connect_account_id)
            : tenant.stripe_connect_account_id,
        applicationFeePercent: tenant.stripe_application_fee_bps ? tenant.stripe_application_fee_bps / 100 : 1,
      } : undefined,
    });
  } catch (error: any) {
    console.error("Config error:", error);
    return c.json({ error: "Failed to load configuration" }, 500);
  }
});

app.get("/market-server/payments/config", async (c) => {
  try {
    const runtimeEnv = resolveRequestEnvironment(c);
    const tenant = await getTenant();
    const publishableKey =
      resolveStripePublishableKey(runtimeEnv) ||
      tenant.config?.stripe?.publishableKey ||
      tenant.config?.stripe?.publishable_key ||
      null;

    if (!publishableKey) {
      return c.json({ error: "Stripe publishable key is not configured" }, 404);
    }

    return c.json({
      publishableKey,
      currency: tenant.default_currency ?? "USD",
      connectAccountId:
        runtimeEnv === "test"
          ? (Deno.env.get("STRIPE_TEST_CONNECT_ACCOUNT_ID") || tenant.stripe_connect_account_id)
          : tenant.stripe_connect_account_id,
      applicationFeeBps: tenant.stripe_application_fee_bps ?? null,
    });
  } catch (error: any) {
    console.error("Stripe config error:", error);
    return c.json({ error: "Failed to load Stripe configuration" }, 500);
  }
});

app.post("/market-server/payments/intent", async (c) => {
  try {
    const runtimeEnv = resolveRequestEnvironment(c);
    const stripeMode: StripeMode = runtimeEnv === "test" ? "test" : "prod";
    const payload = await c.req.json();
    const tenant = await getTenant();
    const connectAccountIdOverride =
      stripeMode === "test"
        ? (Deno.env.get("STRIPE_TEST_CONNECT_ACCOUNT_ID") || null)
        : null;

    // Use client's amount directly - the order endpoint will validate against this same amount
    // Don't recalculate here because client tax calculation differs from server
    // (client taxes only food, server taxes food + fees)
    const amount = Math.round(Number(payload?.amount ?? 0));
    if (!Number.isFinite(amount) || amount < 50) {
      return c.json({ error: "Invalid amount" }, 400);
    }

    const subtotal = Number(payload?.subtotal ?? amount);
    const tax = Number(payload?.tax ?? 0);
    const serviceFee = Number(payload?.serviceFee ?? 0);
    const deliveryFee = Number(payload?.deliveryFee ?? 0);
    const tip = Math.max(Math.round(Number(payload?.tip ?? 0)), 0);
    const discount = Number(payload?.discount ?? 0);
    const platformFee = Number(payload?.platformFee ?? serviceFee);
    const stripeFeeEstimate = Number(payload?.stripeFeeEstimate ?? 0);
    const fulfillmentType = payload?.fulfillmentType ?? "unknown";
    const deliveryProvider =
      payload?.deliveryProvider ??
      (fulfillmentType === "delivery" ? "uber_direct" : "pickup");
    const rawOrderItems = Array.isArray(payload?.orderItems)
      ? payload.orderItems.slice(0, 25)
      : [];
    const sanitizedOrderItems = rawOrderItems
      .map((item: any) => ({
        sku: item?.sku ?? null,
        name: typeof item?.name === "string" ? item.name : "Item",
        qty: Number(item?.qty ?? 0),
        unitPriceCents: Number(item?.unitPriceCents ?? 0),
        totalPriceCents: Number(item?.totalPriceCents ?? 0),
        modifiers: Array.isArray(item?.modifiers)
          ? item.modifiers.slice(0, 10)
          : undefined,
        note:
          typeof item?.note === "string"
            ? item.note.slice(0, 120)
            : undefined,
        unit:
          typeof item?.unit === "string"
            ? item.unit.slice(0, 16)
            : undefined,
        unitLabel:
          typeof item?.unitLabel === "string"
            ? item.unitLabel.slice(0, 64)
            : undefined,
        quantityDisplay:
          typeof item?.quantityDisplay === "string"
            ? item.quantityDisplay.slice(0, 64)
            : undefined,
      }))
      .filter((item: any) => item.qty > 0 && item.name);
    const orderItemsSummary =
      typeof payload?.orderItemsSummary === "string" &&
        payload.orderItemsSummary.trim().length
        ? payload.orderItemsSummary.trim().slice(0, 500)
        : sanitizedOrderItems
          .map((item: any) => {
            const descriptor = item.quantityDisplay || `${item.qty}×`;
            return `${descriptor} ${item.name}`.trim();
          })
          .join(", ")
          .slice(0, 500);
    const breakdown =
      payload?.breakdown && typeof payload.breakdown === "object"
        ? payload.breakdown
        : null;
    const existingPaymentIntentId =
      payload?.paymentIntentId ?? payload?.payment_intent_id ?? null;

    // Tabsy fee structure:
    // - Application Fee: ONLY the 1% platform fee (this shows as "TABSY LLC application fee" in Stripe)
    // - Delivery Fee + Courier Tip: Retained by Tabsy via transfer_data.amount (NOT labeled as application fee)
    //
    // This provides transparent fee breakdown in Stripe Dashboard:
    // - Merchant sees only the 1% platform fee as "application fee"
    // - Delivery fees are automatically retained without confusing labeling
    const courierTip = fulfillmentType === "delivery" ? Math.max(Math.round(tip), 0) : 0;

    // Application fee = ONLY the 1% platform fee
    const applicationFee = platformFee;

    // Total amount Tabsy retains = platform fee + delivery fee + courier tip
    const tabsyRetainedAmount = platformFee + deliveryFee + courierTip;

    // Merchant receives: total - tabsyRetainedAmount - Stripe processing fees
    // Note: Stripe fees are deducted from Tabsy's portion automatically
    const merchantTransferAmount = Math.max(0, Math.round(amount - tabsyRetainedAmount));
    const computedNetPayout = Math.max(
      Math.round(
        amount -
        (stripeFeeEstimate || 0) -
        (platformFee || 0) -
        (deliveryFee || 0) -
        courierTip
      ),
      0
    );

    const customerName = (payload?.customer?.name
      ?? `${payload?.customer?.firstName ?? ""} ${payload?.customer?.lastName ?? ""}`)
      .trim();

    const metadata: Record<string, string> = {
      // Financial breakdown
      subtotal_cents: String(Math.round(subtotal)),
      tax_cents: String(Math.round(tax)),
      tip_cents: String(Math.round(tip)),
      delivery_fee_cents: String(Math.round(deliveryFee)),
      platform_fee_cents: String(Math.round(platformFee)),
      service_fee_cents: String(Math.round(serviceFee)),
      discount_cents: String(Math.round(discount)),
      total_cents: String(Math.round(amount)),
      // Application fee = ONLY the 1% platform fee (what shows in Stripe Dashboard)
      application_fee_cents: String(Math.round(applicationFee)),
      // Total retained by Tabsy = platform fee + delivery fee + courier tip
      tabsy_retained_cents: String(Math.round(tabsyRetainedAmount)),
      // What merchant receives via transfer
      merchant_transfer_cents: String(Math.round(merchantTransferAmount)),

      // Customer information
      customer_name: customerName || "Guest",
      customer_email: payload?.customer?.email ?? "N/A",
      customer_phone: payload?.customer?.phone ?? "N/A",

      // Order context
      fulfillment_type: fulfillmentType,
      delivery_provider: deliveryProvider,
      item_count: String(payload?.items?.length ?? 0),
      coupon_code: payload?.couponCode ?? "none",
      stripe_fee_estimate_cents: String(Math.round(stripeFeeEstimate || 0)),
      stripe_fee_cents: String(Math.round(stripeFeeEstimate || 0)),
      net_payout_estimate_cents: String(computedNetPayout),
      order_items_summary: orderItemsSummary || "N/A",
      uber_quote_id:
        payload?.deliveryQuote?.quoteId ??
        payload?.deliveryQuoteId ??
        payload?.delivery_quote_id ??
        "N/A",
      courier_tip_cents: String(courierTip),

      // Tenant information
      tenant_name: tenant.name ?? "Unknown",
      tenant_slug: tenant.slug ?? tenant.id,
    };

    if (breakdown) {
      const json = JSON.stringify(breakdown);
      if (json.length <= 500) {
        metadata.fee_breakdown_json = json;
      }
    }

    if (sanitizedOrderItems.length) {
      const json = JSON.stringify(sanitizedOrderItems);
      if (json.length <= 500) {
        metadata.order_items_json = json;
      }
    }

    let intent: Stripe.PaymentIntent | null = null;
    let reusedExistingIntent = false;
    if (existingPaymentIntentId) {
      const { data: existingRecord } = await supabase
        .from("payment_intents")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("stripe_payment_intent_id", existingPaymentIntentId)
        .maybeSingle();
      if (existingRecord) {
        const stripe = getStripe(stripeMode);
        // IMPORTANT: Do NOT update application_fee_amount on existing intents.
        // The original intent may have been created with transfer_data.amount,
        // which is mutually exclusive with application_fee_amount.
        // We can only safely update amount and metadata.
        intent = await stripe.paymentIntents.update(existingPaymentIntentId, {
          amount: Math.round(amount),
          metadata,
        });
        reusedExistingIntent = true;
      }
    }

    if (!intent) {
      intent = await createConnectPaymentIntent({
        tenant,
        amountCents: Math.round(amount),
        currency: payload?.currency ?? tenant.default_currency ?? "USD",
        // Application fee = ONLY 1% platform fee (shows as "TABSY LLC application fee")
        applicationFeeAmountCents: applicationFee,
        // Merchant transfer = total - (platform fee + delivery fee + courier tip)
        // This allows Tabsy to retain delivery fees without them showing as "application fee"
        merchantTransferAmountCents: merchantTransferAmount,
        metadata,
        customer: {
          name: customerName || undefined,
          email: payload?.customer?.email,
          phone: payload?.customer?.phone,
        },
        mode: stripeMode,
        connectAccountIdOverride,
      });
    }

    const { data, error } = await supabase
      .from("payment_intents")
      .upsert(
        {
          tenant_id: tenant.id,
          stripe_payment_intent_id: intent.id,
          status: intent.status,
          amount_cents: intent.amount,
          currency: intent.currency?.toUpperCase() ?? (tenant.default_currency ?? "USD"),
          application_fee_amount_cents: intent.application_fee_amount ?? applicationFee,
          transfer_destination: connectAccountIdOverride ?? tenant.stripe_connect_account_id,
          customer_email: payload?.customer?.email ?? null,
          customer_name: customerName || null,
          metadata: {
            ...metadata,
            environment: stripeMode,
            connect_account_id: connectAccountIdOverride ?? tenant.stripe_connect_account_id,
          },
        },
        { onConflict: "stripe_payment_intent_id" },
      )
      .select("id")
      .single();

    if (error || !intent.client_secret || !data) {
      console.error("Persist payment intent error", error);
      return c.json({ error: "Unable to store payment intent" }, 500);
    }

    return c.json({
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amount: intent.amount,
      reused: reusedExistingIntent,
    });
  } catch (error: any) {
    console.error("Payment intent error:", error);
    return c.json({ error: error.message ?? "Failed to initialize payment" }, 400);
  }
});

app.post("/market-server/orders", async (c) => {
  try {
    console.log("📦 Order creation started");
    const runtimeEnv = resolveRequestEnvironment(c);
    const courierEnv: UberMode = runtimeEnv === "test" ? "test" : "prod";
    const payload = await c.req.json();
    console.log("📦 Payload received:", { itemCount: payload?.items?.length, fulfillment: payload?.fulfillmentType });
    if (!payload?.items?.length) return c.json({ error: "Cart is empty" }, 400);
    // Normalize fulfillmentType so downstream logic never sees undefined
    const fulfillmentType =
      payload?.fulfillmentType ??
      payload?.deliveryType ??
      "pickup";
    payload.fulfillmentType = fulfillmentType;

    console.log("📦 Fetching tenant");
    const tenant = await getTenant();
    const tenantId = tenant.id;
    console.log("📦 Tenant ID:", tenantId);

    console.log("📦 Ensuring customer");
    const customer = await ensureCustomer(tenantId, {
      firstName: payload.customer?.firstName ?? payload.customer?.first_name,
      lastName: payload.customer?.lastName ?? payload.customer?.last_name,
      email: payload.customer?.email,
      phone: payload.customer?.phone,
    });
    console.log("📦 Customer ID:", customer.id);

    console.log("📦 Creating delivery address");
    const deliveryAddress = await createDeliveryAddress(
      tenantId,
      customer.id,
      payload.delivery,
    );
    console.log("📦 Delivery address ID:", deliveryAddress?.id);

    const requiresDelivery = fulfillmentType === "delivery";
    const isPickup = fulfillmentType === "pickup";
    const deliveryQuote = payload.deliveryQuote ?? null;
    console.log("📦 Order type:", fulfillmentType, "| Requires delivery:", requiresDelivery);
    let deliveryQuoteContext: DeliveryQuoteContext | null = null;
    let deliveryEnvironment: UberMode = courierEnv;
    if (requiresDelivery) {
      if (!deliveryQuote?.quoteId) {
        return c.json({ error: "Delivery quote required" }, 400);
      }
      if (deliveryQuote.feeCents === undefined) {
        return c.json({ error: "Delivery quote missing fee" }, 400);
      }
      const deliveryInfo = payload.delivery;
      if (!deliveryInfo?.line1 || !deliveryInfo?.city || !deliveryInfo?.state || !deliveryInfo?.zip) {
        return c.json({ error: "Delivery address incomplete" }, 400);
      }
      try {
        const storedContext = await kv.get(`delivery_quote:${deliveryQuote.quoteId}`);
        if (storedContext) {
          const expiresAt = storedContext.expiresAt ? Date.parse(storedContext.expiresAt) : null;
          if (expiresAt && !Number.isNaN(expiresAt) && expiresAt < Date.now()) {
            console.warn("⚠️ Delivery quote context expired, ignoring", { quoteId: deliveryQuote.quoteId });
          } else {
            deliveryQuoteContext = storedContext as DeliveryQuoteContext;
            if (deliveryQuoteContext.environment) {
              deliveryEnvironment = deliveryQuoteContext.environment;
            }
            console.log("🗂️ Loaded delivery quote context", {
              quoteId: deliveryQuote.quoteId,
              pickupLat: deliveryQuoteContext.pickupLatitude,
              pickupLng: deliveryQuoteContext.pickupLongitude,
              environment: deliveryEnvironment,
            });
          }
        } else {
          console.warn("⚠️ No cached delivery quote context found", { quoteId: deliveryQuote.quoteId });
        }
      } catch (contextError) {
        console.error("❌ Failed to load delivery quote context", contextError);
      }
    }

    console.log("📦 Calculating totals");
    const items = payload.items;
    // Round each line item to avoid floating-point precision issues with weight-based products
    // e.g., 0.25 lb @ $22.99/lb = $5.7475 should become $5.75 (575 cents)
    const calculatedSubtotal = items.reduce((sum: number, item: any) => {
      const modTotal = item.mods?.reduce((acc: number, mod: any) => acc + (mod.price ?? 0), 0) ?? 0;
      const lineTotal = Math.round((item.price + modTotal) * item.qty);
      return sum + lineTotal;
    }, 0);

    // Server-detected test environment takes precedence over client claims
    // This ensures test.* origins always use test settings (shorter prep time, robo_courier, etc.)
    const environment = runtimeEnv === "test"
      ? "test"
      : (payload.metadata?.environment ?? "production").toString().toLowerCase();
    // For test environment, use Robo Courier to auto-progress delivery statuses
    // This makes Uber Direct sandbox auto-progress: pending → pickup → delivered
    const testSpecifications = payload.testSpecifications
      ?? payload.delivery?.testSpecifications
      ?? (environment === "test" ? { robo_courier_specification: { mode: "auto" } } : null);

    console.log("🌍 Environment resolution:", {
      runtimeEnv,
      payloadMetadataEnv: payload.metadata?.environment,
      resolvedEnvironment: environment,
      hasTestSpecifications: !!testSpecifications,
      testSpecifications: testSpecifications ? JSON.stringify(testSpecifications) : null,
    });

    // Use consistent prep window for all environments so Uber dispatch matches kitchen timing
    const pickupPrepMinutes = environment === "test"
      ? DEFAULT_PREP_TIME_MINUTES_TEST
      : DEFAULT_PREP_TIME_MINUTES_PROD;
    const deliveryEtaMinutes = pickupPrepMinutes;

    // Server-side authoritative totals
    const taxRate = Number(tenant.config?.pricing?.tax_rate ?? 0.0875);
    const subtotal = calculatedSubtotal;
    const serviceFee = payload.totals?.serviceFee ?? 0;
    const deliveryFee = payload.totals?.deliveryFee ?? 0;
    const tip = Math.max(Math.round(payload.totals?.tip ?? 0), 0);
    const discount = payload.totals?.discount ?? 0;
    const taxableAmount = Math.max(0, subtotal + serviceFee + deliveryFee - discount);
    const tax = Math.round(taxableAmount * taxRate);
    // Round final total to ensure integer cents (no floating-point precision issues)
    const total = Math.round(subtotal + tax + serviceFee + deliveryFee + tip - discount);
    const courierTip = fulfillmentType === "delivery" ? tip : 0;
    console.log("📦 Totals calculated (server authority):", {
      subtotal,
      tax,
      taxRate,
      serviceFee,
      deliveryFee,
      tip,
      discount,
      total,
    });

    if (requiresDelivery && deliveryQuote && deliveryQuote.feeCents !== deliveryFee) {
      return c.json({ error: "Delivery fee mismatch" }, 400);
    }

    // IMPORTANT: Apply configurable prep/ETA windows (faster for localhost testing)
    const etaMinutes = isPickup ? pickupPrepMinutes : deliveryEtaMinutes;
    const etaIso = new Date(Date.now() + etaMinutes * 60000).toISOString();
    console.log(`📦 ETA set to ${etaMinutes} minutes (${etaIso}) for ${payload.fulfillmentType} order (env=${environment})`);

    console.log("📦 Validating payment");
    const intendedPaymentMethod = payload.metadata?.payment_method ?? payload.paymentMethod ?? "card";
    const paymentIntentId = payload.paymentIntentId ?? payload.payment_intent_id ?? null;
    console.log("📦 Payment method:", intendedPaymentMethod, "Payment intent ID:", paymentIntentId);
    if (intendedPaymentMethod === "card" && !paymentIntentId) {
      return c.json({ error: "Payment intent required for card payments" }, 400);
    }
    let paymentIntentRecord: { id: string; metadata?: Record<string, any> } | null = null;
    let paymentStatus: "unpaid" | "processing" | "paid" = "unpaid";

    if (paymentIntentId) {
      console.log("📦 Verifying payment intent with Stripe");
      const { data: storedIntent, error: storedError } = await supabase
        .from("payment_intents")
        .select("id, status, metadata")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (storedError || !storedIntent) {
        return c.json({ error: "Payment intent not recognized" }, 400);
      }

      const paymentStripeMode = resolveStripeMode(runtimeEnv, storedIntent?.metadata?.environment ?? environment);
      const stripeIntent = await retrieveStripePaymentIntent(paymentIntentId, paymentStripeMode);
      console.log("📦 Stripe payment intent retrieved:", { amount: stripeIntent.amount, status: stripeIntent.status });

      // Use client's total for validation since PaymentIntent was created with client's tax calculation
      // Client taxes only food, server taxes food+fees, so they differ - but both are valid
      const clientTotal = Math.round(Number(payload.totals?.total ?? 0));
      if (stripeIntent.amount !== clientTotal) {
        console.error("❌ Payment amount mismatch:", {
          stripeAmount: stripeIntent.amount,
          clientTotal,
          serverTotal: total,
        });
        return c.json({
          error: "Payment amount mismatch",
          details: `Stripe: ${stripeIntent.amount}, Expected: ${clientTotal}`
        }, 400);
      }

      if (!["succeeded", "processing", "requires_capture"].includes(stripeIntent.status)) {
        return c.json({ error: "Payment is not complete" }, 400);
      }

      paymentIntentRecord = storedIntent;
      paymentStatus = stripeIntent.status === "succeeded" ? "paid" : "processing";
      console.log("📦 Payment validated, status:", paymentStatus);

      await supabase
        .from("payment_intents")
        .update({ status: stripeIntent.status, updated_at: nowIso() })
        .eq("id", storedIntent.id);
    }

    console.log("📦 Preparing order metadata");
    const orderMetadata: Record<string, any> = {
      couponCode: payload.couponCode,
      tipMode: payload.tipMode,
      paymentMethod: payload.metadata?.payment_method,
      paymentIntentId,
      courierTipCents: requiresDelivery ? Math.max(Math.round(courierTip), 0) : 0,
      tipAllocation: requiresDelivery ? "courier" : "merchant",
      environment,
      deliveryEnvironment,
    };
    if (deliveryQuote) {
      orderMetadata.deliveryQuote = deliveryQuote;
    }

    console.log("📦 Inserting order into database");

    // IMPORTANT: Pickup orders start as "accepted", delivery orders start as "created"
    // Pickup orders don't need merchant confirmation, they're auto-confirmed
    const initialStatus = isPickup ? "accepted" : "created";
    console.log(`📦 Initial order status: ${initialStatus}`);

    // IMPORTANT: Use the checkout input email/phone for contact fields, NOT the customer record
    // When phone matches an existing customer with different email, customer record may have old email
    // The order should always reflect what the user entered during THIS checkout
    const checkoutFirstName = payload.customer?.firstName ?? payload.customer?.first_name ?? "";
    const checkoutLastName = payload.customer?.lastName ?? payload.customer?.last_name ?? "";
    const checkoutName = `${checkoutFirstName} ${checkoutLastName}`.trim() || null;
    const checkoutEmail = normalizeEmail(payload.customer?.email) ?? customer.email;
    // Use 10-digit format to match customers/loyalty_profiles
    const checkoutPhone = normalizePhone(payload.customer?.phone) ?? customer.phone;

    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenantId,
        customer_id: customer.id,
        delivery_address_id: deliveryAddress?.id ?? null,
        fulfillment_type: payload.fulfillmentType,
        status: initialStatus,
        payment_status: paymentStatus,
        source: "web",
        scheduled_for: null,
        currency: tenant.default_currency ?? "USD",
        subtotal_cents: subtotal,
        tax_cents: tax,
        tip_cents: tip,
        delivery_fee_cents: deliveryFee,
        service_fee_cents: serviceFee,
        discount_cents: discount,
        total_cents: total,
        // Count distinct line items (not quantities) since qty can be fractional for weight-based items
        items_count: items.length,
        contact_name: checkoutName,
        contact_email: checkoutEmail,
        contact_phone: checkoutPhone,
        special_instructions: payload.delivery?.instructions,
        pickup_eta: isPickup ? etaIso : null,
        delivery_eta: requiresDelivery ? etaIso : null,
        promo_id: payload.promoId ?? null,
        promo_code: payload.promoCode ?? payload.couponCode ?? null,
        metadata: orderMetadata,
      })
      .select("*")
      .single();

    if (orderError || !orderRow) {
      console.error("❌ Order insert error:", orderError);
      return c.json({ error: "Failed to create order" }, 500);
    }
    console.log("📦 Order created with ID:", orderRow.id);

    console.log("📦 Inserting order items, count:", items.length);
    const orderItemsToInsert = items.map((item: any) => {
      const modsTotal = item.mods?.reduce((acc: number, mod: any) => acc + (mod.price ?? 0), 0) ?? 0;
      const unit = typeof item.unit === "string" ? item.unit : "each";
      const unitLabel = typeof item.unitLabel === "string" ? item.unitLabel : unit;
      const quantityDisplay =
        typeof item.quantityDisplay === "string" ? item.quantityDisplay : null;
      return {
        order_id: orderRow.id,
        tenant_id: tenantId,
        menu_item_key: item.sku,
        name: item.name,
        description: item.note,
        image_url: item.image,
        unit_price_cents: item.price,
        quantity: item.qty,
        unit_label: unitLabel,
        // Round to handle floating-point quantities (e.g., 1.25 lbs × $14.99/lb)
        total_price_cents: Math.round((item.price + modsTotal) * item.qty),
        modifiers: item.mods ?? [],
        metadata: {
          note: item.note,
          unit,
          unitLabel,
          quantityDisplay,
        },
      };
    });
    console.log("📦 Order items payload:", JSON.stringify(orderItemsToInsert, null, 2));
    const { data: insertedItems, error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsToInsert)
      .select("id");
    if (itemsError || !insertedItems?.length) {
      console.error("❌ Failed to insert order items:", itemsError);
      console.error("❌ Items error details:", JSON.stringify(itemsError, null, 2));
      // CRITICAL: Rollback order if items fail - order without items is broken
      console.error("❌ Rolling back order due to items insert failure");
      await supabase.from("orders").delete().eq("id", orderRow.id);
      return c.json({ error: "Failed to save order items. Please try again." }, 500);
    }
    console.log(`✅ Order items inserted successfully: ${insertedItems.length} items`);

    console.log("📦 Creating initial order events");
    const initialEvents = [
      {
        order_id: orderRow.id,
        tenant_id: tenantId,
        status: "created",
        title: "Order Placed",
        detail: `Your ${payload.fulfillmentType} order has been placed`,
        actor: "customer",
      },
    ];

    // For pickup orders, immediately add "accepted" event
    if (isPickup) {
      initialEvents.push({
        order_id: orderRow.id,
        tenant_id: tenantId,
        status: "accepted",
        title: "Order Confirmed",
        detail: `Your order is confirmed and will be ready for pickup in ${fulfillmentType === "pickup"
            ? (environment === "test" ? DEFAULT_PREP_TIME_MINUTES_TEST : DEFAULT_PREP_TIME_MINUTES_PROD)
            : DEFAULT_PREP_TIME_MINUTES_PROD
          } minutes`,
        actor: "system",
      });
    }

    await supabase.from("order_events").insert(initialEvents);
    console.log(`📦 Created ${initialEvents.length} initial order event(s)`);

    if (requiresDelivery && deliveryQuote) {
      console.log("📦 Creating courier task");
      try {
        const pickupFromTenant = getPickupDetailsFromTenant(tenant);
        const pickupDetails = deliveryQuoteContext
          ? {
            ...pickupFromTenant,
            latitude: deliveryQuoteContext.pickupLatitude ?? pickupFromTenant.latitude,
            longitude: deliveryQuoteContext.pickupLongitude ?? pickupFromTenant.longitude,
          }
          : pickupFromTenant;
        const dropoffAddress = payload.delivery ?? {};
        const dropoffLatitude =
          deliveryQuoteContext?.dropoffLatitude ?? parseCoordinate(dropoffAddress.latitude ?? dropoffAddress.lat);
        const dropoffLongitude =
          deliveryQuoteContext?.dropoffLongitude ?? parseCoordinate(dropoffAddress.longitude ?? dropoffAddress.lng);
        const customerPhone = normalizePhoneNumber(customer.phone ?? payload.customer?.phone ?? null);
        if (!customerPhone) {
          throw new Error("Customer phone number is required for delivery");
        }

        console.log("🚚 Dispatching Uber delivery", {
          quoteId: deliveryQuote.quoteId,
          hasPickupPayload: !!(deliveryQuote.pickupAddressPayload ?? deliveryQuoteContext?.pickupAddressPayload),
          hasDropoffPayload: !!(deliveryQuote.dropoffAddressPayload ?? deliveryQuoteContext?.dropoffAddressPayload),
          pickup: {
            line1: pickupDetails.address.line1,
            city: pickupDetails.address.city,
            state: pickupDetails.address.state,
            lat: pickupDetails.latitude ?? null,
            lng: pickupDetails.longitude ?? null,
          },
          dropoff: {
            line1: dropoffAddress.line1,
            city: dropoffAddress.city,
            state: dropoffAddress.state,
            lat: dropoffLatitude,
            lng: dropoffLongitude,
          },
        });

        const manifestLines: string[] = [];
        const manifestItemsPayload = items.map((item: any) => {
          const quantityInfo = computeManifestQuantityInfo(item);
          const manifestName = quantityInfo.shouldAnnotate && quantityInfo.descriptor
            ? `${item.name} (${quantityInfo.descriptor})`
            : item.name;
          manifestLines.push(
            `${quantityInfo.summaryLabel} ${item.name}`.trim(),
          );
          return {
            name: manifestName,
            quantity: quantityInfo.normalizedQuantity,
            price_cents: item.price,
            size: "medium",
          };
        });
        const manifestDescription =
          manifestLines.length
            ? manifestLines.join("\n").slice(0, 500)
            : `${items.length} item${items.length !== 1 ? "s" : ""} from ${tenant.name ?? "Shahirizada Fresh Market"}`;

        const courierJob = await createUberDelivery({
          quoteId: deliveryQuote.quoteId,
          pickup: pickupDetails,
          pickupAddressPayload: deliveryQuote.pickupAddressPayload ?? deliveryQuoteContext?.pickupAddressPayload,
          dropoff: {
            name: `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || customer.first_name || "Customer",
            phone: customerPhone,
            address: {
              line1: dropoffAddress.line1?.toString() ?? "",
              line2: dropoffAddress.line2?.toString() ?? null,
              city: dropoffAddress.city?.toString() ?? "",
              state: dropoffAddress.state?.toString() ?? "",
              zip: dropoffAddress.zip?.toString() ?? "",
              country: dropoffAddress.country?.toString() ?? "US",
            },
            latitude: dropoffLatitude,
            longitude: dropoffLongitude,
            notes: dropoffAddress.instructions ?? null,
            businessName: null, // dropoff_business_name should be customer's business, not store - leave null for residential
            sellerNotes: `Order #${orderRow.order_number} - ${items.length} items - ${payload.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}`,
          },
          dropoffAddressPayload: deliveryQuote.dropoffAddressPayload ?? deliveryQuoteContext?.dropoffAddressPayload,
          manifest: {
            reference: `Order ${orderRow.order_number}`,
            total_value: subtotal,
            description: manifestDescription,
            items: manifestItemsPayload,
          },
          undeliverableAction: payload.delivery?.undeliverableAction ?? "return",
          deliverableAction: dropoffAddress.deliverableAction ?? (dropoffAddress.instructions ? "deliverable_action_meet_at_door" : "deliverable_action_leave_at_door"),
          externalId: orderRow.id,
          externalStoreId: tenant.slug ?? tenantId,
          tip: courierTip > 0 ? courierTip : undefined,
          testSpecifications: testSpecifications ?? undefined,
          prepTimeMinutes: pickupPrepMinutes,
        }, deliveryEnvironment);

        // Map Uber delivery status to courier_status enum
        const mapUberToCourierStatus = (uberStatus: string): string => {
          const statusMap: Record<string, string> = {
            pending: "dispatching",
            pickup: "dispatching",
            pickup_complete: "en_route",
            dropoff: "en_route",
            delivered: "completed",
            canceled: "cancelled",
            returned: "cancelled",
          };
          return statusMap[uberStatus] || "dispatching";
        };

        const { error: courierInsertError } = await supabase.from("courier_tasks").insert({
          order_id: orderRow.id,
          tenant_id: tenantId,
          provider: "uber",
          status: mapUberToCourierStatus(courierJob.status) as any,
          quote_id: courierJob.quoteId,
          delivery_id: courierJob.deliveryId,
          currency: tenant.default_currency ?? "USD",
          fee_cents: courierJob.feeCents ?? deliveryFee,
          tracking_url: courierJob.trackingUrl,
          raw_quote: courierJob.raw,
          requested_at: nowIso(),
          last_status_at: nowIso(),
          // Track if this is a live/production delivery based on OUR environment detection
          // Don't trust Uber's live_mode response - it can be wrong
          live_mode: deliveryEnvironment === "prod",
        });

        if (courierInsertError) {
          console.error("❌ Failed to insert courier task:", courierInsertError);
          throw new Error(`Failed to create courier task: ${courierInsertError.message}`);
        }

        orderMetadata.courier = {
          provider: "uber",
          deliveryId: courierJob.deliveryId,
          trackingUrl: courierJob.trackingUrl,
        };

        await supabase.from("orders").update({ metadata: orderMetadata }).eq("id", orderRow.id);
        if (deliveryQuoteContext) {
          try {
            await kv.del(`delivery_quote:${deliveryQuote.quoteId}`);
          } catch (cleanupError) {
            console.warn("⚠️ Failed to cleanup delivery quote context", cleanupError);
          }
        }
      } catch (err: any) {
        console.error("Uber delivery dispatch error", err?.message || err, err);
        const failureMessage = err?.message || "Failed to dispatch courier";

        // Preserve the order record and mark it as failed so we have auditability
        await supabase
          .from("orders")
          .update({
            status: "failed" as any,
            metadata: {
              ...orderMetadata,
              courier_error: failureMessage,
              courier_provider: "uber",
            },
            updated_at: nowIso(),
          })
          .eq("id", orderRow.id);

        await supabase.from("order_events").insert({
          order_id: orderRow.id,
          tenant_id: tenantId,
          status: "failed" as any,
          title: "Delivery dispatch failed",
          detail: failureMessage,
          actor: "system",
        });

        return c.json({ error: failureMessage }, 502);
      }
    }

    if (paymentIntentRecord) {
      await supabase
        .from("payment_intents")
        .update({
          metadata: {
            ...(paymentIntentRecord.metadata ?? {}),
            order_id: orderRow.id,
            order_number: String(orderRow.order_number ?? ""),
            order_status: orderRow.status,
            fulfillment_type: orderRow.fulfillment_type,
          },
          updated_at: nowIso(),
        })
        .eq("id", paymentIntentRecord.id);
    }

    console.log("📦 Awarding loyalty points");
    let loyaltySummary: LoyaltySummary | null = null;
    try {
      // IMPORTANT: Use checkoutEmail/checkoutPhone (what user entered) for loyalty
      // NOT payload.customer which may have stale data from matched customer record
      loyaltySummary = await awardLoyaltyForOrder(tenant, orderRow, {
        email: checkoutEmail,
        phone: checkoutPhone,
        firstName: checkoutFirstName,
        lastName: checkoutLastName,
      });
      console.log("📦 Loyalty points awarded:", loyaltySummary?.starsEarned);
    } catch (loyaltyError) {
      console.error("❌ Loyalty award error", loyaltyError);
    }

    console.log("📦 Fetching complete order details");
    const fullOrder = await fetchOrder(tenantId, { id: orderRow.id });
    const progressedOrder = await autoProgressOrderStatuses(
      tenant,
      fullOrder,
      environment,
    );
    const responseOrder = progressedOrder ?? fullOrder;
    const { schedule, order: orderWithSchedule } = await ensureStatusSchedule(
      tenantId,
      responseOrder,
      environment,
    );
    const finalOrder = orderWithSchedule ?? responseOrder;
    scheduleStatusTimers(tenant, finalOrder, schedule);

    // Send notifications via SMS & Email to Customer, Merchant, and Platform
    console.log("📧 Sending order confirmation notifications (SMS + Email)");
    try {
      // Get merchant phone for receiving order notifications (NOT for customer display)
      // Prioritize tenant config phone over env var
      const merchantNotificationPhone = tenant.config?.pickup?.phone || Deno.env.get("MERCHANT_PHONE_NUMBER") || "";

      // Get merchant contact info from tenant config for customer display
      const merchantContactPhone = tenant.config?.contact?.phone || "+1 (760) 300-0080"; // Fallback to known number
      const pickupDetails = getPickupDetailsFromTenant(tenant);
      const merchantAddress = `${pickupDetails.address.line1}, ${pickupDetails.address.city}, ${pickupDetails.address.state} ${pickupDetails.address.zip}`;

      // Format items for notification
      const formattedItems = items.map((item: any) => {
        const modsTotal = item.mods?.reduce((acc: number, mod: any) => acc + (mod.price ?? 0), 0) ?? 0;
        return {
          name: item.name,
          qty: item.qty,
          price: (item.price + modsTotal) * item.qty,
        };
      });
      const metadataTimezone =
        typeof payload.metadata?.customer_timezone === "string"
          ? payload.metadata.customer_timezone.trim()
          : "";
      const notificationTimezone = metadataTimezone || tenant.config?.timezone || null;

      await sendOrderConfirmation({
        customerPhone: payload.customer?.phone || "",
        customerEmail: payload.customer?.email,
        customerName: `${payload.customer?.firstName ?? ""} ${payload.customer?.lastName ?? ""}`.trim() || "Guest",
        merchantNotificationPhone: merchantNotificationPhone, // For sending TO merchant
        merchantContactPhone: merchantContactPhone, // For showing TO customer
        merchantAddress: merchantAddress,
        orderNumber: orderRow.order_number?.toString() || orderRow.id.slice(-6),
        orderTotal: total,
        fulfillmentType: payload.fulfillmentType,
        eta: payload.fulfillmentType === "pickup" ? orderRow.pickup_eta : orderRow.delivery_eta,
        itemsCount: items.length,
        items: formattedItems,
        merchantName: tenant.name ?? "Shahirizada Fresh Market",
        customerTimezone: notificationTimezone ?? undefined,
      });
      console.log("✅ Order confirmation notifications sent successfully");
    } catch (notifError) {
      console.error("⚠️ Notification error (non-fatal):", notifError);
      // Don't fail the order if notifications fail
    }

    try {
      await sendOrderStatusPushForOrder({
        orderId: orderRow.id,
        orderNumber: orderRow.order_number?.toString() || orderRow.id.slice(-6),
        status: orderRow.status,
        fulfillmentType: orderRow.fulfillment_type,
        etaIso: orderRow.fulfillment_type === "delivery"
          ? orderRow.delivery_eta
          : orderRow.pickup_eta,
        userId: customer.auth_user_id ?? null,
        customerId: orderRow.customer_id ?? null,
      });
      console.log("Order confirmation push sent successfully");
    } catch (pushError) {
      console.warn("Order confirmation push failed", pushError);
    }

    // Send push notification to admin users for new order alert
    try {
      await sendNewOrderAdminPush({
        orderId: orderRow.id,
        orderNumber: orderRow.order_number ?? orderRow.id.slice(-6),
        fulfillmentType: orderRow.fulfillment_type,
        totalCents: total,
        customerName: checkoutName || undefined,
        itemCount: items.length,
      });
      console.log("Admin new order push sent successfully");
    } catch (adminPushError) {
      console.warn("Admin new order push failed (non-fatal)", adminPushError);
    }

    // Track promo redemption if a promo was used
    if (payload.promoId && discount > 0) {
      try {
        console.log("📦 Recording promo redemption for promo:", payload.promoId);
        await supabase.from("promo_redemptions").insert({
          tenant_id: tenantId,
          promo_id: payload.promoId,
          order_id: orderRow.id,
          customer_id: customer.id,
          customer_email: checkoutEmail,
          customer_phone: checkoutPhone,
          discount_applied_cents: discount,
          subtotal_at_redemption_cents: subtotal,
        });

        // Increment promo usage count
        await supabase.rpc("increment_promo_usage", { promo_id: payload.promoId });
        console.log("✅ Promo redemption recorded successfully");
      } catch (promoError) {
        // Non-fatal - don't fail the order if promo tracking fails
        console.error("⚠️ Promo redemption tracking failed (non-fatal):", promoError);
      }
    }

    console.log("✅ Order creation complete, returning response");
    return c.json({ order: serializeOrder(finalOrder), loyalty: loyaltySummary }, 201);
  } catch (error: any) {
    console.error("❌ Create order error:", error?.message);
    console.error("❌ Stack trace:", error?.stack);
    return c.json({ error: error.message ?? "Server error" }, 500);
  }
});

app.get("/market-server/orders/:id", async (c) => {
  try {
    const tenant = await getTenant();
    const tenantId = tenant.id;
    let row = await fetchOrder(tenantId, { id: c.req.param("id") });
    const refreshed = row ? await refreshCourierStatusIfStale(row) : false;
    if (refreshed) {
      row = await fetchOrder(tenantId, { id: c.req.param("id") });
    }
    if (!row) return c.json({ error: "Order not found" }, 404);
    const environment =
      typeof row.metadata?.environment === "string"
        ? row.metadata.environment
        : "production";
    const progressed = await autoProgressOrderStatuses(
      tenant,
      row,
      environment,
    );
    const order = progressed ?? row;
    return c.json({ order: serializeOrder(order) });
  } catch (error: any) {
    console.error("Fetch order error:", error);
    return c.json({ error: error.message ?? "Server error" }, 500);
  }
});

app.get("/market-server/orders/:id/receipt", async (c) => {
  try {
    const runtimeEnv = resolveRequestEnvironment(c);
    const tenant = await getTenant();
    const orderId = c.req.param("id");

    const order = await fetchOrder(tenant.id, { id: orderId });
    if (!order) return c.json({ error: "Order not found" }, 404);

    const { data: paymentIntent } = await supabase
      .from("payment_intents")
      .select("stripe_payment_intent_id, metadata")
      .eq("tenant_id", tenant.id)
      .eq("metadata->>order_id", orderId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const paymentIntentId =
      paymentIntent?.stripe_payment_intent_id ||
      order?.metadata?.paymentIntentId ||
      order?.metadata?.payment_intent_id ||
      null;

    if (!paymentIntentId) {
      return c.json({ error: "Receipt unavailable: payment intent missing" }, 404);
    }

    const stripeMode = resolveStripeMode(
      runtimeEnv,
      paymentIntent?.metadata?.environment ?? order?.metadata?.environment ?? null,
    );
    const stripe = getStripe(stripeMode);
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });

    const latestChargeId =
      typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : intent.latest_charge?.id;

    let receiptUrl: string | null = null;
    if (latestChargeId) {
      const charge = await stripe.charges.retrieve(latestChargeId.toString());
      receiptUrl = charge.receipt_url ?? null;
    }

    if (!receiptUrl) {
      return c.json({ error: "Receipt not available yet" }, 404);
    }

    return c.json({ receiptUrl });
  } catch (error: any) {
    console.error("Receipt fetch error:", error);
    return c.json({ error: error.message ?? "Failed to fetch receipt" }, 500);
  }
});

app.get("/market-server/orders/track/:ref", async (c) => {
  try {
    const tenant = await getTenant();
    const tenantId = tenant.id;
    const ref = c.req.param("ref");
    let row = null;
    if (ref.includes("-")) row = await fetchOrder(tenantId, { id: ref });
    if (!row) {
      const numeric = Number(ref);
      if (!Number.isNaN(numeric)) row = await fetchOrder(tenantId, { order_number: numeric });
    }
    if (!row) {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50);
      const match = data?.find((item) => item.order_number?.toString().endsWith(ref));
      if (match) row = await fetchOrder(tenantId, { id: match.id });
    }
    if (row) {
      const refreshed = await refreshCourierStatusIfStale(row);
      if (refreshed) {
        row = await fetchOrder(tenantId, { id: row.id });
      }
    }
    if (!row) return c.json({ error: "Order not found" }, 404);
    const environment =
      typeof row.metadata?.environment === "string"
        ? row.metadata.environment
        : "production";
    const progressed = await autoProgressOrderStatuses(
      tenant,
      row,
      environment,
    );
    const order = progressed ?? row;
    return c.json({ order: serializeOrder(order) });
  } catch (error: any) {
    console.error("Track order error:", error);
    return c.json({ error: error.message ?? "Server error" }, 500);
  }
});

// ---------------------------------------------------------------------------
// Customer: Fetch orders by email/phone/customerId (bypasses RLS for guests)
// ---------------------------------------------------------------------------

app.post("/market-server/orders/customer-lookup", async (c) => {
  try {
    const tenant = await getTenant();
    const body = await c.req.json().catch(() => ({}));

    const email = body?.email?.toString().trim().toLowerCase();
    const phone = body?.phone?.toString().replace(/\D/g, "");
    const customerId = body?.customerId?.toString().trim();

    if (!email && !phone && !customerId) {
      return c.json({ error: "Email, phone, or customerId required" }, 400);
    }

    // Build OR conditions
    const conditions: string[] = [];
    if (customerId) conditions.push(`customer_id.eq.${customerId}`);
    if (email) conditions.push(`contact_email.eq.${email}`);
    if (phone) conditions.push(`contact_phone.eq.${phone}`);

    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(*)
      `)
      .eq("tenant_id", tenant.id)
      .or(conditions.join(","))
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Customer order lookup error:", error);
      return c.json({ error: "Failed to fetch orders" }, 500);
    }

    return c.json({ orders: orders || [] });
  } catch (error: any) {
    console.error("Customer order lookup error:", error);
    return c.json({ error: error.message ?? "Server error" }, 500);
  }
});

// ---------------------------------------------------------------------------
// Customer: Order cancellation within 3-minute edit window
// ---------------------------------------------------------------------------

const EDIT_WINDOW_MINUTES = 3;

app.post("/market-server/orders/:id/customer-cancel", async (c) => {
  try {
    const runtimeEnv = resolveRequestEnvironment(c);
    const tenant = await getTenant();
    const orderId = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));

    // Validate required fields for customer identification
    const customerPhone = body?.customerPhone || body?.phone;
    const customerEmail = body?.customerEmail || body?.email;
    const reason = typeof body?.reason === "string" && body.reason.trim().length
      ? body.reason.trim()
      : "Canceled by customer";

    if (!customerPhone && !customerEmail) {
      return c.json({ error: "Customer phone or email required for verification" }, 400);
    }

    // Fetch the order
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      console.error("Customer cancel fetch error:", error);
      return c.json({ error: error.message }, 400);
    }
    if (!order) return c.json({ error: "Order not found" }, 404);

    // Verify customer identity - phone or email must match
    // Use 10-digit normalized format for consistent comparison
    const normalizedPhone = customerPhone ? normalizePhone(customerPhone) : null;
    const orderPhone = normalizePhone(order.contact_phone ?? null);
    const orderEmail = order.contact_email?.toLowerCase().trim();
    const providedEmail = customerEmail?.toLowerCase().trim();

    const phoneMatch = normalizedPhone && orderPhone && normalizedPhone === orderPhone;
    const emailMatch = providedEmail && orderEmail && providedEmail === orderEmail;

    if (!phoneMatch && !emailMatch) {
      return c.json({ error: "Customer verification failed - phone or email does not match order" }, 403);
    }

    // Check if order is within 3-minute edit window
    const createdAt = new Date(order.created_at);
    const editWindowEnd = new Date(createdAt.getTime() + EDIT_WINDOW_MINUTES * 60 * 1000);
    const now = new Date();

    if (now > editWindowEnd) {
      const minutesAgo = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
      return c.json({
        error: `Edit window expired. Orders can only be canceled within ${EDIT_WINDOW_MINUTES} minutes of placement. This order was placed ${minutesAgo} minutes ago.`,
        editWindowExpired: true,
        placedAt: order.created_at,
        editWindowEnd: editWindowEnd.toISOString(),
      }, 400);
    }

    // Check if order is already in terminal status
    const terminal = ["delivered", "canceled", "failed", "rejected"];
    if (terminal.includes(order.status)) {
      return c.json({ error: `Order already ${order.status}` }, 400);
    }

    // Attempt refund before updating status
    const { data: paymentIntentRow } = await supabase
      .from("payment_intents")
      .select("id, stripe_payment_intent_id, metadata, status")
      .eq("tenant_id", tenant.id)
      .eq("metadata->>order_id", orderId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const paymentIntentId =
      paymentIntentRow?.stripe_payment_intent_id ||
      order.metadata?.paymentIntentId ||
      order.metadata?.payment_intent_id ||
      null;

    type RefundSummary = {
      status: "refunded" | "not_charged";
      amountCents?: number;
      id?: string;
      processingFeeEstimate?: number;
    };

    let refundSummary: RefundSummary = { status: "not_charged" };

    if (paymentIntentId) {
      try {
        const stripeMode = resolveStripeMode(
          runtimeEnv,
          paymentIntentRow?.metadata?.environment ?? order.metadata?.environment ?? null,
        );
        const stripe = getStripe(stripeMode);
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["charges"],
        });

        const charges = Array.isArray(intent.charges?.data) ? intent.charges.data : [];
        const capturedAmount = charges.reduce(
          (sum: number, charge: any) => sum + (charge.amount_captured ?? charge.amount ?? 0),
          0,
        );
        const refundableAmount = Math.max(intent.amount_received ?? 0, capturedAmount);
        const targetAmount =
          refundableAmount > 0 && order.total_cents && order.total_cents > 0
            ? Math.min(order.total_cents, refundableAmount)
            : refundableAmount;

        if (targetAmount > 0) {
          // Estimate Stripe processing fee (2.9% + $0.30) - this is NOT refunded
          const processingFeeEstimate = Math.round(targetAmount * 0.029 + 30);

          const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: targetAmount,
            reason: "requested_by_customer",
            metadata: {
              order_id: orderId,
              tenant_id: tenant.id,
              cancel_reason: reason,
              canceled_by: "customer",
              within_edit_window: "true",
            },
            refund_application_fee: true,
            reverse_transfer: true,
          });

          refundSummary = {
            status: "refunded",
            amountCents: refund.amount ?? targetAmount,
            id: refund.id,
            processingFeeEstimate,
          };
        } else {
          // If payment wasn't captured, cancel the PaymentIntent to release holds
          if (intent.status !== "canceled") {
            await stripe.paymentIntents.cancel(paymentIntentId).catch((err: any) => {
              console.warn("⚠️ Failed to cancel uncaptured payment intent", err?.message || err);
            });
          }
          refundSummary = { status: "not_charged", amountCents: 0 };
        }

        await supabase
          .from("payment_intents")
          .update({
            status: refundSummary.status === "refunded" ? "refunded" as any : intent.status,
            metadata: {
              ...(paymentIntentRow?.metadata ?? {}),
              last_refund_id: refundSummary.id ?? (paymentIntentRow?.metadata as any)?.last_refund_id,
              last_cancel_reason: reason,
              canceled_by: "customer",
            },
            updated_at: nowIso(),
          })
          .eq("stripe_payment_intent_id", paymentIntentId);
      } catch (refundError: any) {
        console.error("Customer cancel refund error:", refundError);
        return c.json({ error: refundError.message ?? "Failed to refund payment" }, 400);
      }
    }

    const paymentStatusUpdate =
      refundSummary.status === "refunded"
        ? "refunded"
        : (order.payment_status as string) || "unpaid";

    await supabase
      .from("orders")
      .update({
        status: "canceled" as any,
        payment_status: paymentStatusUpdate as any,
        updated_at: nowIso(),
        metadata: {
          ...(order.metadata ?? {}),
          canceled_by: "customer",
          canceled_at: nowIso(),
          cancel_reason: reason,
          within_edit_window: true,
        },
      })
      .eq("id", orderId);

    // First fetch courier task to get delivery_id before updating status
    const { data: courierTask } = await supabase
      .from("courier_tasks")
      .select("delivery_id, status")
      .eq("order_id", orderId)
      .maybeSingle();

    await supabase.from("courier_tasks").update({
      status: "cancelled" as any,
      updated_at: nowIso(),
      last_status_at: nowIso(),
    }).eq("order_id", orderId);

    // If this is a delivery order with an active Uber delivery, cancel it
    if (order.fulfillment_type === "delivery" && courierTask?.delivery_id) {
      const terminalStatuses = ["completed", "cancelled", "delivered"];
      if (!terminalStatuses.includes(courierTask.status || "")) {
        try {
          const cancelResult = await cancelUberDelivery(courierTask.delivery_id);
          if (cancelResult.success) {
            console.log(`✅ Uber delivery ${courierTask.delivery_id} cancelled for customer cancel of order ${orderId}`);
          } else {
            console.warn(`⚠️ Failed to cancel Uber delivery ${courierTask.delivery_id}: ${cancelResult.error}`);
          }
        } catch (uberError: any) {
          console.error(`⚠️ Error cancelling Uber delivery:`, uberError.message);
          // Don't fail the order cancellation if Uber cancel fails
        }
      }
    }

    const refundDetail =
      refundSummary.status === "refunded"
        ? `Refunded $${(((refundSummary.amountCents ?? order.total_cents) ?? 0) / 100).toFixed(2)} to the original payment method.`
        : "No payment was captured; no refund needed.";

    await supabase.from("order_events").insert({
      order_id: orderId,
      tenant_id: tenant.id,
      status: "canceled" as any,
      title: "Order canceled by customer",
      detail: `${reason}. ${refundDetail}`,
      actor: "customer",
      metadata: {
        canceled_within_edit_window: true,
        refund_id: refundSummary.id,
        refund_amount_cents: refundSummary.amountCents,
      },
    });

    // Revoke loyalty points for canceled order
    let loyaltyRevocation: { starsRevoked: number; newBalance: number } | null = null;
    try {
      loyaltyRevocation = await revokeLoyaltyForCanceledOrder(tenant, order);
      if (loyaltyRevocation) {
        console.log(`📦 Revoked ${loyaltyRevocation.starsRevoked} loyalty stars for canceled order ${orderId}`);
      }
    } catch (loyaltyError) {
      console.error("⚠️ Failed to revoke loyalty points (non-blocking):", loyaltyError);
      // Don't fail the cancellation if loyalty revocation fails
    }

    const refreshed = await fetchOrder(tenant.id, { id: orderId });

    // Notify customer + merchant about cancellation and refund
    try {
      const pickupDetails = getPickupDetailsFromTenant(tenant);
      const customerName = order.contact_name || "Customer";
      const customerPhoneForNotify = normalizePhoneNumber(order.contact_phone ?? null) ?? "";
      const customerEmailForNotify =
        typeof order.contact_email === "string" && order.contact_email.trim().length > 0
          ? order.contact_email.trim()
          : undefined;
      const orderNumber =
        order.order_number?.toString() ||
        order.short_code ||
        order.id.slice(-6);

      const refundAmountFormatted = refundSummary.amountCents
        ? `$${(refundSummary.amountCents / 100).toFixed(2)}`
        : order.total_cents
          ? `$${(order.total_cents / 100).toFixed(2)}`
          : "your payment";

      const statusDetail =
        refundSummary.status === "refunded"
          ? `Your order has been canceled. A full refund of ${refundAmountFormatted} has been processed back to your original payment method. You should see it in 5-10 business days (depending on your bank). Note: Stripe processing fees (~2.9% + $0.30) may not be refunded.`
          : `Your order has been canceled. Your payment was never charged, so no refund is needed.`;

      await sendStatusUpdate({
        customerPhone: customerPhoneForNotify,
        customerEmail: customerEmailForNotify,
        customerName,
        merchantPhone: pickupDetails.phone,
        orderNumber,
        status: "canceled",
        statusTitle: "Order Canceled",
        statusDetail,
        merchantName: tenant.name ?? pickupDetails.name ?? "Shahirizada Fresh Market",
      });

      await sendOrderStatusPushForOrder({
        orderId: order.id,
        orderNumber,
        status: "canceled",
        fulfillmentType: order.fulfillment_type,
        etaIso: order.fulfillment_type === "delivery"
          ? order.delivery_eta
          : order.pickup_eta,
        customerId: order.customer_id ?? null,
      });
    } catch (notifyError) {
      console.error("⚠️ Failed to send cancellation notification:", notifyError);
    }

    return c.json({
      order: serializeOrder(refreshed),
      refund: {
        status: refundSummary.status,
        amountCents: refundSummary.amountCents,
        amountFormatted: refundSummary.amountCents
          ? `$${(refundSummary.amountCents / 100).toFixed(2)}`
          : null,
        processingFeeEstimate: refundSummary.processingFeeEstimate,
        processingFeeNote: refundSummary.processingFeeEstimate
          ? `Note: Stripe processing fees (~$${(refundSummary.processingFeeEstimate / 100).toFixed(2)}) may not be refunded.`
          : null,
      },
    });
  } catch (error: any) {
    console.error("Customer cancel error:", error);
    return c.json({ error: error.message ?? "Server error" }, 500);
  }
});

// ---------------------------------------------------------------------------
// Admin: Dashboard stats from Stripe (source of truth for financials)
// ---------------------------------------------------------------------------

app.get("/market-server/admin/stats", async (c) => {
  const admin = await requireSupabaseAdmin(c);
  if (!admin.ok) return admin.response;

  try {
    const tenant = await getTenant();
    const stripe = getStripe();
    const connectAccountId = tenant.stripe_connect_account_id;

    // Get today's date boundaries in UTC
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStartUnix = Math.floor(todayStart.getTime() / 1000);

    // Fetch payment intents from Stripe (succeeded only for revenue)
    // Use transfer_group to identify orders going to this connected account
    const allPayments = await stripe.paymentIntents.list({
      limit: 100,
      expand: ["data.latest_charge"],
    });

    // Filter to only payments for this connected account
    const merchantPayments = connectAccountId
      ? allPayments.data.filter(
          (pi) => pi.transfer_data?.destination === connectAccountId || pi.on_behalf_of === connectAccountId
        )
      : allPayments.data;

    const succeededPayments = merchantPayments.filter((pi) => pi.status === "succeeded");
    const todayPayments = succeededPayments.filter((pi) => pi.created >= todayStartUnix);

    // Calculate revenue (amount goes to merchant minus platform fee)
    const totalRevenue = succeededPayments.reduce((sum, pi) => {
      // For destination charges, the merchant gets amount - application_fee
      const appFee = pi.application_fee_amount ?? 0;
      return sum + (pi.amount - appFee);
    }, 0);

    const todayRevenue = todayPayments.reduce((sum, pi) => {
      const appFee = pi.application_fee_amount ?? 0;
      return sum + (pi.amount - appFee);
    }, 0);

    // Get order counts from Supabase (for active orders tracking)
    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, status, created_at")
      .eq("tenant_id", tenant.id);

    const orders = ordersData ?? [];
    const todayStr = now.toISOString().split("T")[0];
    const activeOrders = orders.filter(
      (o) => !["delivered", "canceled", "failed", "rejected"].includes(o.status)
    );
    const todayOrders = orders.filter((o) => o.created_at?.startsWith(todayStr));

    // Get customer count
    const { count: customerCount } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id);

    const avgOrderValue =
      succeededPayments.length > 0
        ? Math.round(totalRevenue / succeededPayments.length)
        : 0;

    return c.json({
      totalOrders: succeededPayments.length,
      activeOrders: activeOrders.length,
      todayOrders: todayOrders.length,
      totalRevenue: totalRevenue / 100, // Convert cents to dollars
      todayRevenue: todayRevenue / 100,
      totalCustomers: customerCount ?? 0,
      avgOrderValue: avgOrderValue / 100,
      source: "stripe", // Indicate data source
    });
  } catch (error: any) {
    console.error("Admin stats error:", error);
    // Fallback to Supabase if Stripe fails
    try {
      const tenant = await getTenant();
      const { data: ordersData } = await supabase
        .from("orders")
        .select("total_cents, payment_status, status, created_at")
        .eq("tenant_id", tenant.id);

      const { count: customerCount } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id);

      const orders = ordersData ?? [];
      const today = new Date().toISOString().split("T")[0];
      const paidOrders = orders.filter((o) => o.payment_status === "paid");
      const todayPaidOrders = paidOrders.filter((o) => o.created_at?.startsWith(today));
      const activeOrders = orders.filter(
        (o) => !["delivered", "canceled", "failed", "rejected"].includes(o.status)
      );

      return c.json({
        totalOrders: orders.length,
        activeOrders: activeOrders.length,
        todayOrders: orders.filter((o) => o.created_at?.startsWith(today)).length,
        totalRevenue: paidOrders.reduce((sum, o) => sum + (o.total_cents ?? 0), 0) / 100,
        todayRevenue: todayPaidOrders.reduce((sum, o) => sum + (o.total_cents ?? 0), 0) / 100,
        totalCustomers: customerCount ?? 0,
        avgOrderValue:
          paidOrders.length > 0
            ? paidOrders.reduce((sum, o) => sum + (o.total_cents ?? 0), 0) / paidOrders.length / 100
            : 0,
        source: "supabase", // Fallback source
      });
    } catch (fallbackError: any) {
      return c.json({ error: fallbackError.message ?? "Server error" }, 500);
    }
  }
});

// ---------------------------------------------------------------------------
// Admin: Orders list + status controls (Supabase auth, admin role required)
// ---------------------------------------------------------------------------

app.get("/market-server/admin/orders", async (c) => {
  const admin = await requireSupabaseAdmin(c);
  if (!admin.ok) return admin.response;

  try {
    const tenant = await getTenant();
    const status = c.req.query("status");
    const fulfillment = c.req.query("fulfillment");
    const limitParam = Number(c.req.query("limit") ?? "50");
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(200, Math.floor(limitParam)))
      : 50;

    let query = supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status as never);
    if (fulfillment) query = query.eq("fulfillment_type", fulfillment as never);

    const { data, error } = await query;
    if (error) {
      console.error("Admin orders fetch error:", error);
      return c.json({ error: error.message }, 400);
    }

    const orders = (data ?? []).map(serializeOrder);
    return c.json({ orders });
  } catch (error: any) {
    console.error("Admin orders error:", error);
    return c.json({ error: error.message ?? "Server error" }, 500);
  }
});

app.post("/market-server/admin/orders/:id/picked-up", async (c) => {
  const admin = await requireSupabaseAdmin(c);
  if (!admin.ok) return admin.response;

  try {
    const tenant = await getTenant();
    const orderId = c.req.param("id");
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      console.error("Admin pickup fetch error:", error);
      return c.json({ error: error.message }, 400);
    }
    if (!order) return c.json({ error: "Order not found" }, 404);
    if (order.fulfillment_type !== "pickup") {
      return c.json({ error: "Only pickup orders can be marked picked up" }, 400);
    }

    const terminal = ["delivered", "canceled", "failed", "rejected"];
    if (terminal.includes(order.status)) {
      return c.json({ error: `Order already ${order.status}` }, 400);
    }

    await supabase
      .from("orders")
      .update({
        status: "delivered" as any,
        updated_at: nowIso(),
      })
      .eq("id", orderId);

    await supabase.from("order_events").insert({
      order_id: orderId,
      tenant_id: tenant.id,
      status: "delivered" as any,
      title: "Order picked up",
      detail: "Marked as picked up by admin",
      actor: "admin",
    });

    const refreshed = await fetchOrder(tenant.id, { id: orderId });

    // Notify customer + merchant about pickup completion
    try {
      const pickupDetails = getPickupDetailsFromTenant(tenant);
      const customerName = order.contact_name || "Customer";
      const customerPhone = normalizePhoneNumber(order.contact_phone ?? null) ?? "";
      const customerEmail =
        typeof order.contact_email === "string" && order.contact_email.trim().length > 0
          ? order.contact_email.trim()
          : undefined;

      const orderNumber =
        order.order_number?.toString() ||
        order.short_code ||
        order.id.slice(-6);

      await sendStatusUpdate({
        customerPhone,
        customerEmail,
        customerName,
        merchantPhone: pickupDetails.phone,
        orderNumber,
        status: "delivered",
        statusTitle: "Order picked up",
        statusDetail: "Thanks! Your pickup order was marked as picked up.",
        merchantName: tenant.name ?? pickupDetails.name ?? "Shahirizada Fresh Market",
      });

      await sendOrderStatusPushForOrder({
        orderId: order.id,
        orderNumber,
        status: "delivered",
        fulfillmentType: order.fulfillment_type,
        etaIso: order.fulfillment_type === "delivery"
          ? order.delivery_eta
          : order.pickup_eta,
        customerId: order.customer_id ?? null,
      });
    } catch (notifyError) {
      console.error("⚠️ Failed to send pickup notification:", notifyError);
    }

    return c.json({ order: serializeOrder(refreshed) });
  } catch (error: any) {
    console.error("Admin pickup update error:", error);
    return c.json({ error: error.message ?? "Server error" }, 500);
  }
});

app.post("/market-server/admin/orders/:id/cancel", async (c) => {
  const admin = await requireSupabaseAdmin(c);
  if (!admin.ok) return admin.response;

  try {
    const runtimeEnv = resolveRequestEnvironment(c);
    const tenant = await getTenant();
    const orderId = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" && body.reason.trim().length
      ? body.reason.trim()
      : "Canceled by admin";

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      console.error("Admin cancel fetch error:", error);
      return c.json({ error: error.message }, 400);
    }
    if (!order) return c.json({ error: "Order not found" }, 404);

    const terminal = ["delivered", "canceled", "failed", "rejected"];
    if (terminal.includes(order.status)) {
      return c.json({ error: `Order already ${order.status}` }, 400);
    }

    // Attempt refund before updating status
    const { data: paymentIntentRow } = await supabase
      .from("payment_intents")
      .select("id, stripe_payment_intent_id, metadata, status")
      .eq("tenant_id", tenant.id)
      .eq("metadata->>order_id", orderId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const paymentIntentId =
      paymentIntentRow?.stripe_payment_intent_id ||
      order.metadata?.paymentIntentId ||
      order.metadata?.payment_intent_id ||
      null;

    type RefundSummary = {
      status: "refunded" | "not_charged";
      amountCents?: number;
      id?: string;
    };

    let refundSummary: RefundSummary = { status: "not_charged" };

    if (paymentIntentId) {
      try {
        const stripeMode = resolveStripeMode(
          runtimeEnv,
          paymentIntentRow?.metadata?.environment ?? order.metadata?.environment ?? null,
        );
        const stripe = getStripe(stripeMode);
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["charges"],
        });

        const charges = Array.isArray(intent.charges?.data) ? intent.charges.data : [];
        const capturedAmount = charges.reduce(
          (sum: number, charge: any) => sum + (charge.amount_captured ?? charge.amount ?? 0),
          0,
        );
        const refundableAmount = Math.max(intent.amount_received ?? 0, capturedAmount);
        const targetAmount =
          refundableAmount > 0 && order.total_cents && order.total_cents > 0
            ? Math.min(order.total_cents, refundableAmount)
            : refundableAmount;

        if (targetAmount > 0) {
          const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: targetAmount,
            reason: "requested_by_customer",
            metadata: {
              order_id: orderId,
              tenant_id: tenant.id,
              admin_id: admin.user?.id ?? "admin",
              cancel_reason: reason,
            },
            refund_application_fee: true,
            reverse_transfer: true,
          });

          refundSummary = {
            status: "refunded",
            amountCents: refund.amount ?? targetAmount,
            id: refund.id,
          };
        } else {
          // If payment wasn't captured, cancel the PaymentIntent to release holds
          if (intent.status !== "canceled") {
            await stripe.paymentIntents.cancel(paymentIntentId).catch((err: any) => {
              console.warn("⚠️ Failed to cancel uncaptured payment intent", err?.message || err);
            });
          }
          refundSummary = { status: "not_charged", amountCents: 0 };
        }

        await supabase
          .from("payment_intents")
          .update({
            status: refundSummary.status === "refunded" ? "refunded" as any : intent.status,
            metadata: {
              ...(paymentIntentRow?.metadata ?? {}),
              last_refund_id: refundSummary.id ?? (paymentIntentRow?.metadata as any)?.last_refund_id,
              last_cancel_reason: reason,
            },
            updated_at: nowIso(),
          })
          .eq("stripe_payment_intent_id", paymentIntentId);
      } catch (refundError: any) {
        console.error("Refund error:", refundError);
        return c.json({ error: refundError.message ?? "Failed to refund payment" }, 400);
      }
    }

    const paymentStatusUpdate =
      refundSummary.status === "refunded"
        ? "refunded"
        : (order.payment_status as string) || "unpaid";

    await supabase
      .from("orders")
      .update({
        status: "canceled" as any,
        payment_status: paymentStatusUpdate as any,
        updated_at: nowIso(),
      })
      .eq("id", orderId);

    // First fetch courier task to get delivery_id before updating status
    const { data: courierTask } = await supabase
      .from("courier_tasks")
      .select("delivery_id, status")
      .eq("order_id", orderId)
      .maybeSingle();

    await supabase.from("courier_tasks").update({
      status: "cancelled" as any,
      updated_at: nowIso(),
      last_status_at: nowIso(),
    }).eq("order_id", orderId);

    // If this is a delivery order with an active Uber delivery, cancel it
    if (order.fulfillment_type === "delivery" && courierTask?.delivery_id) {
      const terminalStatuses = ["completed", "cancelled", "delivered"];
      if (!terminalStatuses.includes(courierTask.status || "")) {
        try {
          const cancelResult = await cancelUberDelivery(courierTask.delivery_id);
          if (cancelResult.success) {
            console.log(`✅ Uber delivery ${courierTask.delivery_id} cancelled for order ${orderId}`);
          } else {
            console.warn(`⚠️ Failed to cancel Uber delivery ${courierTask.delivery_id}: ${cancelResult.error}`);
          }
        } catch (uberError: any) {
          console.error(`⚠️ Error cancelling Uber delivery:`, uberError.message);
          // Don't fail the order cancellation if Uber cancel fails
        }
      }
    }

    const refundDetail =
      refundSummary.status === "refunded"
        ? `Refunded $${(((refundSummary.amountCents ?? order.total_cents) ?? 0) / 100).toFixed(2)} to the original payment method.`
        : "No payment was captured; no refund needed.";

    await supabase.from("order_events").insert({
      order_id: orderId,
      tenant_id: tenant.id,
      status: "canceled" as any,
      title: "Order canceled",
      detail: `${reason}. ${refundDetail}`,
      actor: "admin",
    });

    const refreshed = await fetchOrder(tenant.id, { id: orderId });

    // Notify customer + merchant about cancellation and refund
    try {
      const pickupDetails = getPickupDetailsFromTenant(tenant);
      const customerName = order.contact_name || "Customer";
      const customerPhone = normalizePhoneNumber(order.contact_phone ?? null) ?? "";
      const customerEmail =
        typeof order.contact_email === "string" && order.contact_email.trim().length > 0
          ? order.contact_email.trim()
          : undefined;
      const orderNumber =
        order.order_number?.toString() ||
        order.short_code ||
        order.id.slice(-6);

      const refundAmountFormatted = refundSummary.amountCents
        ? `$${(refundSummary.amountCents / 100).toFixed(2)}`
        : order.total_cents
          ? `$${(order.total_cents / 100).toFixed(2)}`
          : "your payment";

      const statusDetail =
        refundSummary.status === "refunded"
          ? `${reason}. Don't worry — a full refund of ${refundAmountFormatted} has already been processed back to your original payment method. You should see it in 5-10 business days (depending on your bank). If you have any questions, please call us.`
          : `${reason}. Your payment was never charged, so no refund is needed. Your card was not billed.`;

      await sendStatusUpdate({
        customerPhone,
        customerEmail,
        customerName,
        merchantPhone: pickupDetails.phone,
        orderNumber,
        status: "canceled",
        statusTitle: "Order Canceled",
        statusDetail,
        merchantName: tenant.name ?? pickupDetails.name ?? "Shahirizada Fresh Market",
      });

      await sendOrderStatusPushForOrder({
        orderId: order.id,
        orderNumber,
        status: "canceled",
        fulfillmentType: order.fulfillment_type,
        etaIso: order.fulfillment_type === "delivery"
          ? order.delivery_eta
          : order.pickup_eta,
        customerId: order.customer_id ?? null,
      });
    } catch (notifyError) {
      console.error("⚠️ Failed to send cancellation notification:", notifyError);
    }

    return c.json({ order: serializeOrder(refreshed) });
  } catch (error: any) {
    console.error("Admin cancel error:", error);
    return c.json({ error: error.message ?? "Server error" }, 500);
  }
});

// ---------------------------------------------------------------------------
// Admin: User management (requires admin role, uses service role Supabase client)
// ---------------------------------------------------------------------------

app.post("/market-server/admin/users/assign-role", async (c) => {
  const admin = await requireSupabaseAdmin(c);
  if (!admin.ok) return admin.response;

  try {
    const body = await c.req.json().catch(() => ({}));
    const email = (body?.email || "").toString().trim().toLowerCase();
    const role = (body?.role || "").toString().trim().toLowerCase();
    const action = (body?.action || "add").toString().trim().toLowerCase(); // add | remove

    if (!email || !role) {
      return c.json({ error: "email and role are required" }, 400);
    }

    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);
    if (userError || !userData?.user) {
      return c.json({ error: "User not found" }, 404);
    }

    const user = userData.user as SupabaseAuthUser;
    const appRoles = (user.app_metadata as any)?.roles ?? (user.app_metadata as any)?.role;
    const rolesArr = [
      ...(Array.isArray(appRoles) ? appRoles : appRoles ? [appRoles] : []),
    ]
      .flat()
      .filter(Boolean)
      .map((r) => (typeof r === "string" ? r.toLowerCase() : ""));

    let nextRoles = rolesArr;
    if (action === "remove") {
      nextRoles = rolesArr.filter((r) => r !== role);
    } else if (!rolesArr.includes(role)) {
      nextRoles = [...rolesArr, role];
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: { ...(user.app_metadata || {}), roles: nextRoles },
    });
    if (updateError) {
      return c.json({ error: updateError.message }, 400);
    }

    return c.json({ success: true, roles: nextRoles });
  } catch (error: any) {
    console.error("Admin assign role error:", error);
    return c.json({ error: error.message ?? "Server error" }, 500);
  }
});

app.post("/market-server/admin/users/reset-password", async (c) => {
  const admin = await requireSupabaseAdmin(c);
  if (!admin.ok) return admin.response;

  try {
    const body = await c.req.json().catch(() => ({}));
    const email = (body?.email || "").toString().trim().toLowerCase();
    const newPassword = (body?.password || "").toString();

    if (!email || !newPassword) {
      return c.json({ error: "email and password are required" }, 400);
    }
    if (newPassword.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }

    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);
    if (userError || !userData?.user) {
      return c.json({ error: "User not found" }, 404);
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.user.id,
      { password: newPassword },
    );
    if (updateError) {
      return c.json({ error: updateError.message }, 400);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Admin reset password error:", error);
    return c.json({ error: error.message ?? "Server error" }, 500);
  }
});

app.get("/market-server/menu", async (c) => {
  try {
    const tenantId = (await getTenant()).id;
    const menu = await loadMenu(supabase, tenantId);
    return c.json(menu);
  } catch (error: any) {
    console.error("Menu error:", error?.message || error);
    console.error("Menu error stack:", error?.stack);
    return c.json({ error: error?.message || "Menu fetch failed", stack: error?.stack }, 500);
  }
});

app.get("/market-server/blog/posts", async (c) => {
  try {
    const store = await getBlogStore();
    if (!Array.isArray(store.posts) || store.posts.length === 0) {
      console.warn("KV blog store is empty. Run /migrate-blog-posts to seed Supabase storage.");
    }
    return c.json(store);
  } catch (error: any) {
    console.error("Blog posts error:", error?.message || error);
    return c.json({ error: error?.message || "Blog fetch failed" }, 500);
  }
});

app.post("/market-server/loyalty/profile", async (c) => {
  try {
    const tenantId = (await getTenant()).id;
    const body = await c.req.json();
    const email = body?.email?.toString();
    const phone = body?.phone?.toString();
    if (!email && !phone) {
      return c.json({ error: "Email or phone required" }, 400);
    }

    const profile = await findLoyaltyProfile(tenantId, { email, phone });
    if (!profile) {
      return c.json({ profile: null, events: [] }, 200);
    }

    const { data: events } = await supabase
      .from("loyalty_events")
      .select("id, created_at, stars, description, type")
      .eq("tenant_id", tenantId)
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);

    return c.json({
      profile: serializeLoyaltyProfile(profile),
      events: events ?? [],
    });
  } catch (error: any) {
    console.error("Loyalty lookup error:", error);
    return c.json({ error: error.message ?? "Unable to load loyalty profile" }, 500);
  }
});

// ============================================================================
// Stripe Webhooks
// ============================================================================

/**
 * Stripe Platform Webhook Endpoint (YOUR ACCOUNT)
 *
 * IMPORTANT: Configure this endpoint in your Stripe Dashboard:
 * https://dashboard.stripe.com/webhooks
 * Select "Your account" as the event source.
 *
 * Endpoint URL: https://your-edge-function.supabase.co/market-server/webhooks/stripe
 *
 * Events to enable:
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - payment_intent.canceled
 * - charge.refunded
 * - charge.dispute.created
 *
 * This webhook updates Supabase database and sends SMS/Email notifications.
 */
app.post("/market-server/webhooks/stripe", async (c) => {
  try {
    const signature = c.req.header("stripe-signature");
    if (!signature) {
      return c.json({ error: "Missing stripe-signature header" }, 400);
    }

    const prodWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const testWebhookSecret = Deno.env.get("STRIPE_TEST_WEBHOOK_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");
    if (!prodWebhookSecret && !testWebhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return c.json({ error: "Webhook not configured" }, 500);
    }

    const rawBody = await c.req.text();
    let stripeMode: StripeModeRuntime = "prod";
    let stripe = getStripe("prod");
    let event;
    try {
      if (!prodWebhookSecret) throw new Error("skip prod verification");
      event = await verifyWebhookSignature(rawBody, signature, prodWebhookSecret, stripe);
    } catch (err) {
      if (testWebhookSecret) {
        stripeMode = "test";
        stripe = getStripe("test");
        event = await verifyWebhookSignature(rawBody, signature, testWebhookSecret, stripe);
      } else {
        throw err;
      }
    }

    console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

    // Route to appropriate handler
    const handler = WEBHOOK_HANDLERS[event.type];
    if (handler) {
      await handler(event, supabase, stripe);
      console.log(`[Webhook] Successfully handled: ${event.type}`);
    } else {
      console.log(`[Webhook] No handler for event type: ${event.type}`);
    }

    return c.json({ received: true });
  } catch (error: any) {
    console.error("[Webhook] Error:", error.message);
    return c.json({ error: error.message }, 400);
  }
});

/**
 * Stripe Connect Webhook Endpoint (CONNECTED ACCOUNTS)
 *
 * IMPORTANT: Configure this endpoint in your Stripe Dashboard:
 * https://dashboard.stripe.com/webhooks
 * Select "Connected and v2 accounts" as the event source.
 *
 * Endpoint URL: https://your-edge-function.supabase.co/market-server/webhooks/stripe-connect
 *
 * Events to enable:
 * - transfer.created (funds transferred to merchant)
 * - transfer.failed (transfer failed)
 * - application_fee.created (platform fee created)
 * - application_fee.refunded (platform fee refunded)
 * - account.updated (merchant account status changed)
 * - account.application.deauthorized (merchant disconnected)
 * - account.external_account.created (bank account added)
 * - account.external_account.deleted (bank account removed)
 *
 * This webhook sends SMS/Email notifications to merchants and internal team.
 */
app.post("/market-server/webhooks/stripe-connect", async (c) => {
  try {
    const signature = c.req.header("stripe-signature");
    if (!signature) {
      return c.json({ error: "Missing stripe-signature header" }, 400);
    }

    const rawBody = await c.req.text();

    console.log(`[Connect Webhook] Received request`);

    // Handle Connect webhook (includes signature verification)
    const result = await handleConnectWebhook(rawBody, signature);

    if (!result.success) {
      console.error(`[Connect Webhook] Error: ${result.error}`);
      return c.json({ error: result.error }, 400);
    }

    return c.json({ received: true });
  } catch (error: any) {
    console.error("[Connect Webhook] Error:", error.message);
    return c.json({ error: error.message }, 400);
  }
});

// ============================================================================
// Uber Direct Webhooks
// ============================================================================

/**
 * Uber Direct Webhook Endpoint
 *
 * IMPORTANT: Configure this endpoint in your Uber Direct Dashboard:
 * https://direct.uber.com/developer (navigate to Webhooks tab)
 *
 * Endpoint URL: https://your-project.supabase.co/functions/v1/market-server/webhooks/uber
 *
 * Events to enable:
 * - event.delivery_status (delivery updates)
 * - event.courier_update (courier location updates)
 * - event.refund (refund events)
 *
 * SECURITY: You will receive a Webhook Signing Key after creating the webhook.
 * Set it as: UBER_WEBHOOK_SIGNING_KEY environment variable
 */
app.post("/market-server/webhooks/uber", async (c) => {
  try {
    // Get signature from header (can be x-uber-signature or x-postmates-signature)
    const signature = c.req.header("x-uber-signature") || c.req.header("x-postmates-signature");
    if (!signature) {
      console.error("Missing x-uber-signature header");
      return c.json({ error: "Missing signature header" }, 400);
    }

    const rawBody = await c.req.text();
    const webhook = JSON.parse(rawBody);

    console.log(`[Uber Webhook] Received event: ${webhook.kind} (delivery: ${webhook.delivery_id})`);

    // Handle webhook (includes signature verification)
    const result = await handleUberWebhook(webhook, signature, rawBody);

    if (!result.success) {
      console.error(`[Uber Webhook] Error: ${result.error}`);
      return c.json({ error: result.error }, 400);
    }

    console.log(`[Uber Webhook] Successfully handled: ${webhook.kind}`);
    return c.json({ received: true });
  } catch (error: any) {
    console.error("[Uber Webhook] Error:", error.message);
    return c.json({ error: error.message }, 400);
  }
});

// ============================================================================
// Stripe Connect Account Management
// ============================================================================

/**
 * Create a new Connect account for a merchant
 *
 * POST /market-server/connect/accounts
 *
 * Body:
 * {
 *   "email": "merchant@example.com",
 *   "country": "US",
 *   "businessName": "Shahirizada Fresh Market",
 *   "type": "express" // or "standard", "custom"
 * }
 */
app.post("/market-server/connect/accounts", async (c) => {
  try {
    const admin = await requireSupabaseAdmin(c);
    if (!admin.ok) return admin.response;

    const runtimeEnv = resolveRequestEnvironment(c);
    const stripeMode: StripeModeRuntime = runtimeEnv === "test" ? "test" : "prod";
    const body = await c.req.json();
    const stripe = getStripe(stripeMode);

    const account = await createConnectAccount(stripe, {
      type: body.type || "express",
      email: body.email,
      country: body.country || "US",
      businessName: body.businessName,
      metadata: body.metadata || {},
    });

    return c.json({
      account: {
        id: account.id,
        type: account.type,
        email: account.email,
        country: account.country,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        ...getAccountStatus(account),
      },
    }, 201);
  } catch (error: any) {
    console.error("Create Connect account error:", error);
    return c.json({ error: error.message }, 400);
  }
});

/**
 * Get Connect account details
 *
 * GET /market-server/connect/accounts/:accountId
 */
app.get("/market-server/connect/accounts/:accountId", async (c) => {
  try {
    const admin = await requireSupabaseAdmin(c);
    if (!admin.ok) return admin.response;

    const runtimeEnv = resolveRequestEnvironment(c);
    const stripeMode: StripeModeRuntime = runtimeEnv === "test" ? "test" : "prod";
    const accountId = c.req.param("accountId");
    const stripe = getStripe(stripeMode);

    const account = await getConnectAccount(stripe, accountId);
    const status = getAccountStatus(account);

    return c.json({
      account: {
        id: account.id,
        type: account.type,
        email: account.email,
        country: account.country,
        businessProfile: account.business_profile,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        capabilities: account.capabilities,
        requirements: account.requirements,
        isReady: isAccountReady(account),
        ...status,
      },
    });
  } catch (error: any) {
    console.error("Get Connect account error:", error);
    return c.json({ error: error.message }, 400);
  }
});

/**
 * Create an onboarding link for a Connect account
 *
 * POST /market-server/connect/account-links
 *
 * Body:
 * {
 *   "accountId": "acct_xxx",
 *   "refreshUrl": "https://your-app.com/connect/refresh",
 *   "returnUrl": "https://your-app.com/connect/return"
 * }
 */
app.post("/market-server/connect/account-links", async (c) => {
  try {
    const admin = await requireSupabaseAdmin(c);
    if (!admin.ok) return admin.response;

    const runtimeEnv = resolveRequestEnvironment(c);
    const stripeMode: StripeModeRuntime = runtimeEnv === "test" ? "test" : "prod";
    const body = await c.req.json();
    const stripe = getStripe(stripeMode);

    const accountLink = await createAccountLink(stripe, {
      accountId: body.accountId,
      refreshUrl: body.refreshUrl,
      returnUrl: body.returnUrl,
      type: body.type || "account_onboarding",
    });

    return c.json({
      url: accountLink.url,
      expiresAt: accountLink.expires_at,
    });
  } catch (error: any) {
    console.error("Create account link error:", error);
    return c.json({ error: error.message }, 400);
  }
});

/**
 * Create a login link for Express accounts
 *
 * POST /market-server/connect/login-links
 *
 * Body:
 * {
 *   "accountId": "acct_xxx"
 * }
 */
app.post("/market-server/connect/login-links", async (c) => {
  try {
    const admin = await requireSupabaseAdmin(c);
    if (!admin.ok) return admin.response;

    const runtimeEnv = resolveRequestEnvironment(c);
    const stripeMode: StripeModeRuntime = runtimeEnv === "test" ? "test" : "prod";
    const body = await c.req.json();
    const stripe = getStripe(stripeMode);

    const loginLink = await createLoginLink(stripe, body.accountId);

    return c.json({
      url: loginLink.url,
    });
  } catch (error: any) {
    console.error("Create login link error:", error);
    return c.json({ error: error.message }, 400);
  }
});

/**
 * Get current tenant's Connect account status
 *
 * GET /market-server/connect/status
 */
app.get("/market-server/connect/status", async (c) => {
  try {
    const runtimeEnv = resolveRequestEnvironment(c);
    const tenant = await getTenant();
    const stripeMode: StripeModeRuntime = runtimeEnv === "test" ? "test" : "prod";
    const connectAccountIdOverride =
      stripeMode === "test"
        ? (Deno.env.get("STRIPE_TEST_CONNECT_ACCOUNT_ID") || null)
        : null;

    const connectAccountId = connectAccountIdOverride ?? tenant.stripe_connect_account_id;

    if (!connectAccountId) {
      return c.json({
        connected: false,
        message: "No Connect account configured",
      });
    }

    const stripe = getStripe(stripeMode);
    const account = await getConnectAccount(stripe, connectAccountId);
    const status = getAccountStatus(account);

    return c.json({
      connected: true,
      accountId: account.id,
      ...status,
      capabilities: account.capabilities,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pendingVerification: account.requirements?.pending_verification || [],
      },
    });
  } catch (error: any) {
    console.error("Get Connect status error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ---------------------------------------------------------------------------
// Promo Code Validation (public endpoint - validates a promo code)
// ---------------------------------------------------------------------------

type PromoRecord = {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  min_subtotal_cents: number;
  max_discount_cents: number | null;
  first_time_only: boolean;
  one_per_customer: boolean;
  start_date: string;
  expire_date: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
};

type PromoValidationResult = {
  valid: boolean;
  promo?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    discountType: "percentage" | "fixed_amount";
    discountValue: number;
    maxDiscountCents: number | null;
  };
  discountCents?: number;
  error?: string;
  errorCode?: string;
};

async function validatePromoCode(
  tenantId: string,
  code: string,
  subtotalCents: number,
  customerEmail?: string | null,
  customerPhone?: string | null,
): Promise<PromoValidationResult> {
  const normalizedCode = code.trim().toUpperCase();

  // 1. Fetch promo by code
  const { data: promo, error: promoError } = await supabase
    .from("promos")
    .select("*")
    .eq("tenant_id", tenantId)
    .ilike("code", normalizedCode)
    .eq("is_active", true)
    .maybeSingle();

  if (promoError) {
    console.error("Promo fetch error:", promoError);
    return { valid: false, error: "Failed to validate promo code", errorCode: "FETCH_ERROR" };
  }

  if (!promo) {
    return { valid: false, error: "Invalid promo code", errorCode: "INVALID_CODE" };
  }

  const promoRecord = promo as PromoRecord;
  const now = new Date();

  // 2. Check date range
  const startDate = new Date(promoRecord.start_date);
  if (now < startDate) {
    return { valid: false, error: "This promo code is not yet active", errorCode: "NOT_STARTED" };
  }

  if (promoRecord.expire_date) {
    const expireDate = new Date(promoRecord.expire_date);
    if (now > expireDate) {
      return { valid: false, error: "This promo code has expired", errorCode: "EXPIRED" };
    }
  }

  // 3. Check usage limit
  if (promoRecord.usage_limit !== null && promoRecord.usage_count >= promoRecord.usage_limit) {
    return { valid: false, error: "This promo code has reached its usage limit", errorCode: "USAGE_LIMIT" };
  }

  // 4. Check minimum subtotal
  if (subtotalCents < promoRecord.min_subtotal_cents) {
    const minSubtotalDollars = (promoRecord.min_subtotal_cents / 100).toFixed(2);
    return {
      valid: false,
      error: `Minimum order of $${minSubtotalDollars} required for this promo`,
      errorCode: "MIN_SUBTOTAL",
    };
  }

  // 5. Check first-time customer (if required)
  if (promoRecord.first_time_only) {
    // Query orders to see if this customer has placed an order before
    let hasOrders = false;

    if (customerEmail) {
      const { count: emailOrderCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .ilike("contact_email", customerEmail)
        .in("payment_status", ["paid", "processing"]);

      if (emailOrderCount && emailOrderCount > 0) {
        hasOrders = true;
      }
    }

    if (!hasOrders && customerPhone) {
      const normalizedPhone = normalizePhone(customerPhone);
      if (normalizedPhone) {
        const { count: phoneOrderCount } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("contact_phone", normalizedPhone)
          .in("payment_status", ["paid", "processing"]);

        if (phoneOrderCount && phoneOrderCount > 0) {
          hasOrders = true;
        }
      }
    }

    if (hasOrders) {
      return {
        valid: false,
        error: "This promo code is for first-time customers only",
        errorCode: "NOT_FIRST_TIME",
      };
    }
  }

  // 6. Check one-per-customer (if required)
  if (promoRecord.one_per_customer) {
    let hasUsedPromo = false;

    if (customerEmail) {
      const { count: emailRedemptionCount } = await supabase
        .from("promo_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("promo_id", promoRecord.id)
        .ilike("customer_email", customerEmail);

      if (emailRedemptionCount && emailRedemptionCount > 0) {
        hasUsedPromo = true;
      }
    }

    if (!hasUsedPromo && customerPhone) {
      const normalizedPhone = normalizePhone(customerPhone);
      if (normalizedPhone) {
        const { count: phoneRedemptionCount } = await supabase
          .from("promo_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("promo_id", promoRecord.id)
          .eq("customer_phone", normalizedPhone);

        if (phoneRedemptionCount && phoneRedemptionCount > 0) {
          hasUsedPromo = true;
        }
      }
    }

    if (hasUsedPromo) {
      return {
        valid: false,
        error: "You have already used this promo code",
        errorCode: "ALREADY_USED",
      };
    }
  }

  // 7. Calculate discount
  let discountCents: number;
  if (promoRecord.discount_type === "percentage") {
    discountCents = Math.round(subtotalCents * (promoRecord.discount_value / 100));
  } else {
    discountCents = promoRecord.discount_value;
  }

  // Apply max discount cap
  if (promoRecord.max_discount_cents !== null && discountCents > promoRecord.max_discount_cents) {
    discountCents = promoRecord.max_discount_cents;
  }

  // Ensure discount doesn't exceed subtotal
  if (discountCents > subtotalCents) {
    discountCents = subtotalCents;
  }

  return {
    valid: true,
    promo: {
      id: promoRecord.id,
      code: promoRecord.code,
      name: promoRecord.name,
      description: promoRecord.description,
      discountType: promoRecord.discount_type,
      discountValue: promoRecord.discount_value,
      maxDiscountCents: promoRecord.max_discount_cents,
    },
    discountCents,
  };
}

app.post("/market-server/promos/validate", async (c) => {
  try {
    const tenant = await getTenant();
    const body = await c.req.json();

    const { code, subtotalCents, customerEmail, customerPhone } = body;

    if (!code || typeof code !== "string") {
      return c.json({ valid: false, error: "Promo code is required", errorCode: "MISSING_CODE" }, 400);
    }

    if (typeof subtotalCents !== "number" || subtotalCents < 0) {
      return c.json({ valid: false, error: "Valid subtotal is required", errorCode: "INVALID_SUBTOTAL" }, 400);
    }

    const result = await validatePromoCode(
      tenant.id,
      code,
      subtotalCents,
      customerEmail,
      customerPhone,
    );

    return c.json(result);
  } catch (error: any) {
    console.error("Promo validation error:", error);
    return c.json({ valid: false, error: "Server error", errorCode: "SERVER_ERROR" }, 500);
  }
});

// ---------------------------------------------------------------------------
// Admin: Promo Management CRUD
// ---------------------------------------------------------------------------

app.get("/market-server/admin/promos", async (c) => {
  const admin = await requireSupabaseAdmin(c);
  if (!admin.ok) return admin.response;

  try {
    const tenant = await getTenant();
    const includeInactive = c.req.query("includeInactive") === "true";

    let query = supabase
      .from("promos")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Admin promos fetch error:", error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ promos: data ?? [] });
  } catch (error: any) {
    console.error("Admin promos error:", error);
    return c.json({ error: error.message ?? "Server error" }, 500);
  }
});

app.post("/market-server/admin/promos", async (c) => {
  const admin = await requireSupabaseAdmin(c);
  if (!admin.ok) return admin.response;

  try {
    const tenant = await getTenant();
    const body = await c.req.json();

    // Validate required fields
    if (!body.code || typeof body.code !== "string") {
      return c.json({ error: "Promo code is required" }, 400);
    }
    if (!body.name || typeof body.name !== "string") {
      return c.json({ error: "Promo name is required" }, 400);
    }
    if (!["percentage", "fixed_amount"].includes(body.discountType)) {
      return c.json({ error: "Invalid discount type" }, 400);
    }
    if (typeof body.discountValue !== "number" || body.discountValue <= 0) {
      return c.json({ error: "Discount value must be a positive number" }, 400);
    }

    const { data, error } = await supabase
      .from("promos")
      .insert({
        tenant_id: tenant.id,
        code: body.code.trim().toUpperCase(),
        name: body.name.trim(),
        description: body.description?.trim() || null,
        discount_type: body.discountType,
        discount_value: body.discountValue,
        min_subtotal_cents: body.minSubtotalCents ?? 0,
        max_discount_cents: body.maxDiscountCents ?? null,
        first_time_only: body.firstTimeOnly ?? false,
        one_per_customer: body.onePerCustomer ?? true,
        start_date: body.startDate ?? new Date().toISOString(),
        expire_date: body.expireDate ?? null,
        usage_limit: body.usageLimit ?? null,
        is_active: body.isActive ?? true,
        created_by: admin.user.id,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Admin promo create error:", error);
      if (error.code === "23505") {
        return c.json({ error: "A promo with this code already exists" }, 400);
      }
      return c.json({ error: error.message }, 400);
    }

    return c.json({ promo: data });
  } catch (error: any) {
    console.error("Admin promo create error:", error);
    return c.json({ error: error.message ?? "Server error" }, 500);
  }
});

app.put("/market-server/admin/promos/:id", async (c) => {
  const admin = await requireSupabaseAdmin(c);
  if (!admin.ok) return admin.response;

  try {
    const tenant = await getTenant();
    const promoId = c.req.param("id");
    const body = await c.req.json();

    // Build update object with only provided fields
    const updates: Record<string, any> = { updated_at: nowIso() };

    if (body.code !== undefined) updates.code = body.code.trim().toUpperCase();
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.discountType !== undefined) updates.discount_type = body.discountType;
    if (body.discountValue !== undefined) updates.discount_value = body.discountValue;
    if (body.minSubtotalCents !== undefined) updates.min_subtotal_cents = body.minSubtotalCents;
    if (body.maxDiscountCents !== undefined) updates.max_discount_cents = body.maxDiscountCents;
    if (body.firstTimeOnly !== undefined) updates.first_time_only = body.firstTimeOnly;
    if (body.onePerCustomer !== undefined) updates.one_per_customer = body.onePerCustomer;
    if (body.startDate !== undefined) updates.start_date = body.startDate;
    if (body.expireDate !== undefined) updates.expire_date = body.expireDate;
    if (body.usageLimit !== undefined) updates.usage_limit = body.usageLimit;
    if (body.isActive !== undefined) updates.is_active = body.isActive;

    const { data, error } = await supabase
      .from("promos")
      .update(updates)
      .eq("id", promoId)
      .eq("tenant_id", tenant.id)
      .select("*")
      .single();

    if (error) {
      console.error("Admin promo update error:", error);
      if (error.code === "23505") {
        return c.json({ error: "A promo with this code already exists" }, 400);
      }
      return c.json({ error: error.message }, 400);
    }

    if (!data) {
      return c.json({ error: "Promo not found" }, 404);
    }

    return c.json({ promo: data });
  } catch (error: any) {
    console.error("Admin promo update error:", error);
    return c.json({ error: error.message ?? "Server error" }, 500);
  }
});

app.delete("/market-server/admin/promos/:id", async (c) => {
  const admin = await requireSupabaseAdmin(c);
  if (!admin.ok) return admin.response;

  try {
    const tenant = await getTenant();
    const promoId = c.req.param("id");

    const { error } = await supabase
      .from("promos")
      .delete()
      .eq("id", promoId)
      .eq("tenant_id", tenant.id);

    if (error) {
      console.error("Admin promo delete error:", error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Admin promo delete error:", error);
    return c.json({ error: error.message ?? "Server error" }, 500);
  }
});

Deno.serve((req) => app.fetch(req));
