import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type PushStatus =
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "ready"
  | "delivered"
  | "canceled";

type OrderPushPayload = {
  userId: string;
  orderId: string;
  orderNumber?: string;
  status: PushStatus;
  progress?: number;
  fulfillmentType?: "delivery" | "pickup";
  etaMinutes?: number;
  title?: string;
  subtitle?: string;
  icon?: string;
  deeplink?: string;
};

type OrderStatusPushInput = {
  orderId: string;
  orderNumber?: string | null;
  status: string;
  fulfillmentType?: "delivery" | "pickup" | null;
  etaIso?: string | null;
  userId?: string | null;
  customerId?: string | null;
};

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
const ONESIGNAL_ANDROID_CHANNEL_ID = Deno.env.get("ONESIGNAL_ANDROID_CHANNEL_ID");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const PUSH_STATUS_SET = new Set<PushStatus>([
  "confirmed",
  "preparing",
  "out_for_delivery",
  "ready",
  "delivered",
  "canceled",
]);

const STATUS_ALIAS_MAP: Record<string, { status: PushStatus; progress?: number }> = {
  created: { status: "confirmed", progress: 0.1 },
  accepted: { status: "confirmed", progress: 0.2 },
  in_kitchen: { status: "preparing", progress: 0.5 },
  courier_requested: { status: "preparing", progress: 0.6 },
  driver_en_route: { status: "out_for_delivery", progress: 0.75 },
  driver_assigned: { status: "out_for_delivery", progress: 0.75 },
  picked_up: { status: "out_for_delivery", progress: 0.85 },
  ready: { status: "ready", progress: 0.8 },
  delivered: { status: "delivered", progress: 1.0 },
  canceled: { status: "canceled", progress: 1.0 },
  rejected: { status: "canceled", progress: 1.0 },
  failed: { status: "canceled", progress: 1.0 },
};

const statusLabel = (status: PushStatus) => {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "preparing":
      return "Preparing";
    case "out_for_delivery":
      return "Out for delivery";
    case "ready":
      return "Ready";
    case "delivered":
      return "Delivered";
    case "canceled":
      return "Canceled";
    default:
      return "Updated";
  }
};

const fallbackProgress = (status: PushStatus) => {
  switch (status) {
    case "confirmed":
      return 0.2;
    case "preparing":
      return 0.5;
    case "out_for_delivery":
      return 0.8;
    case "ready":
      return 0.8;
    case "delivered":
      return 1.0;
    case "canceled":
      return 1.0;
    default:
      return 0.1;
  }
};

const resolvePushStatus = (status?: string | null): { status: PushStatus; progress?: number } | null => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  if (PUSH_STATUS_SET.has(normalized as PushStatus)) {
    return { status: normalized as PushStatus };
  }
  return STATUS_ALIAS_MAP[normalized] ?? null;
};

const computeEtaMinutes = (etaIso?: string | null): number | undefined => {
  if (!etaIso) return undefined;
  const etaMs = Date.parse(etaIso);
  if (Number.isNaN(etaMs)) return undefined;
  return Math.max(0, Math.round((etaMs - Date.now()) / 60000));
};

const resolveCustomerAuthUserId = async (customerId?: string | null): Promise<string | null> => {
  if (!customerId || !supabase) return null;
  const { data } = await supabase
    .from("customers")
    .select("auth_user_id")
    .eq("id", customerId)
    .maybeSingle();
  return data?.auth_user_id ?? null;
};

const getPlayerIds = async (userId: string) => {
  if (!supabase) return [] as string[];
  const { data } = await supabase
    .from("push_tokens")
    .select("onesignal_player_id")
    .eq("user_id", userId)
    .eq("is_active", true);
  return (data ?? [])
    .map((row) => row.onesignal_player_id)
    .filter((id): id is string => Boolean(id));
};

export const sendOrderStatusPush = async (payload: OrderPushPayload): Promise<void> => {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    throw new Error("Missing OneSignal secrets");
  }

  const progress = typeof payload.progress === "number"
    ? payload.progress
    : fallbackProgress(payload.status);

  const heading = payload.title || "Order update";
  const subtitle = payload.subtitle || (payload.orderNumber ? `Order #${payload.orderNumber}` : "Order update");

  const data = {
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    status: payload.status,
    progress,
    fulfillmentType: payload.fulfillmentType,
    etaMinutes: payload.etaMinutes,
    title: heading,
    subtitle,
    icon: payload.icon,
    deeplink: payload.deeplink || `shahirizada://orders/${payload.orderId}`,
  };

  const includeExternalUserIds = payload.userId ? [payload.userId] : [];
  const includePlayerIds = payload.userId ? await getPlayerIds(payload.userId) : [];

  const body: Record<string, unknown> = {
    app_id: ONESIGNAL_APP_ID,
    target_channel: "push",
    headings: { en: heading },
    contents: { en: `Order ${statusLabel(payload.status)}` },
    data,
    ios_badgeType: "Increase",
    ios_badgeCount: 1,
  };

  if (ONESIGNAL_ANDROID_CHANNEL_ID) {
    body.android_channel_id = ONESIGNAL_ANDROID_CHANNEL_ID;
  }

  if (includeExternalUserIds.length) {
    body.include_external_user_ids = includeExternalUserIds;
    body.channel_for_external_user_ids = "push";
  } else if (includePlayerIds.length) {
    body.include_player_ids = includePlayerIds;
  } else {
    console.log(`Push skipped: no target ids for order ${payload.orderId}`);
    return;
  }

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OneSignal error: ${response.status} ${text}`);
  }
};

export const sendOrderStatusPushForOrder = async (
  input: OrderStatusPushInput
): Promise<void> => {
  const resolvedStatus = resolvePushStatus(input.status);
  if (!resolvedStatus) {
    console.log(`Push skipped: unsupported status "${input.status}"`);
    return;
  }

  const userId = input.userId || await resolveCustomerAuthUserId(input.customerId);
  if (!userId) {
    console.log(`Push skipped: missing userId for order ${input.orderId}`);
    return;
  }

  const etaMinutes = computeEtaMinutes(input.etaIso);

  await sendOrderStatusPush({
    userId,
    orderId: input.orderId,
    orderNumber: input.orderNumber ?? undefined,
    status: resolvedStatus.status,
    progress: resolvedStatus.progress,
    fulfillmentType: input.fulfillmentType ?? undefined,
    etaMinutes,
  });
};

// ============================================================================
// OneSignal Live Activity Updates (iOS Lock Screen Widgets)
// ============================================================================

type LiveActivityStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "in_kitchen"
  | "ready"
  | "courier_requested"
  | "courier_assigned"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled";

const LIVE_ACTIVITY_PROGRESS: Record<string, number> = {
  pending: 0.0,
  confirmed: 0.15,
  preparing: 0.3,
  in_kitchen: 0.45,
  ready: 0.6,
  courier_requested: 0.7,
  courier_assigned: 0.75,
  picked_up: 0.85,
  out_for_delivery: 0.9,
  delivered: 1.0,
  completed: 1.0,
  cancelled: 0.0,
};

const LIVE_ACTIVITY_LABELS: Record<string, string> = {
  pending: "Order Pending",
  confirmed: "Order Confirmed",
  preparing: "Preparing",
  in_kitchen: "In Kitchen",
  ready: "Ready",
  courier_requested: "Finding Driver",
  courier_assigned: "Driver Assigned",
  picked_up: "On the Way",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

type LiveActivityUpdateInput = {
  activityId: string;
  orderId: string;
  status: string;
  fulfillment: "pickup" | "delivery";
  eta?: string | null;
  courierName?: string | null;
  trackingUrl?: string | null;
};

/**
 * Check if OneSignal is configured for Live Activities
 */
export const isOneSignalConfigured = (): boolean => {
  return !!(ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY);
};

/**
 * Update a Live Activity via OneSignal API
 * This pushes updates to iOS lock screen widgets even when app is closed
 */
export const updateLiveActivity = async (
  input: LiveActivityUpdateInput
): Promise<{ success: boolean; error?: string }> => {
  if (!isOneSignalConfigured()) {
    console.warn("⚠️ OneSignal not configured - skipping Live Activity update");
    return { success: false, error: "OneSignal not configured" };
  }

  const { activityId, orderId, status, fulfillment, eta, courierName } = input;

  // Determine if this is a terminal state (should end the activity)
  const terminalStatuses = ["delivered", "completed", "cancelled", "canceled"];
  const isTerminal = terminalStatuses.includes(status);

  const progress = LIVE_ACTIVITY_PROGRESS[status] ?? 0.5;
  const statusLabel = LIVE_ACTIVITY_LABELS[status] ?? status;

  const eventUpdates: Record<string, unknown> = {
    status,
    statusLabel,
    progress,
    fulfillment,
  };

  if (eta) {
    eventUpdates.eta = eta;
  }

  if (courierName) {
    eventUpdates.courierName = courierName;
  }

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    event: isTerminal ? "end" : "update",
    event_updates: eventUpdates,
    name: `order_${orderId}_status_${status}`,
  };

  const url = `https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/live_activities/${activityId}/notifications`;

  try {
    console.log(
      `📲 Sending Live Activity ${isTerminal ? "end" : "update"} for order ${orderId}: ${status}`
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OneSignal Live Activity API error: ${response.status} - ${errorText}`);
      return { success: false, error: `API error: ${response.status}` };
    }

    const result = await response.json();
    console.log(`✅ Live Activity updated successfully for order ${orderId}:`, result);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to update Live Activity:`, errorMessage);
    return { success: false, error: errorMessage };
  }
};

// ============================================================================
// Admin New Order Push Notifications (Web Push)
// ============================================================================

export type NewOrderAdminPushInput = {
  orderId: string;
  orderNumber: number | string;
  fulfillmentType: "pickup" | "delivery";
  totalCents: number;
  customerName?: string;
  itemCount?: number;
};

/**
 * Send push notification to all admin users when a new order is placed.
 * Uses OneSignal tag filtering to target users with role=admin tag.
 */
export const sendNewOrderAdminPush = async (
  input: NewOrderAdminPushInput
): Promise<{ success: boolean; error?: string }> => {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.log("⚠️ Skipping admin push: Missing OneSignal credentials");
    return { success: false, error: "Missing OneSignal credentials" };
  }

  const totalFormatted = `$${(input.totalCents / 100).toFixed(2)}`;
  const fulfillmentEmoji = input.fulfillmentType === "delivery" ? "🚗" : "🛍️";
  const fulfillmentLabel = input.fulfillmentType === "delivery" ? "Delivery" : "Pickup";

  const heading = `🛒 New Order #${input.orderNumber}`;
  const content = `${fulfillmentEmoji} ${fulfillmentLabel} • ${totalFormatted}${
    input.customerName ? ` • ${input.customerName}` : ""
  }${input.itemCount ? ` • ${input.itemCount} item${input.itemCount > 1 ? "s" : ""}` : ""}`;

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    // Target all users with "role" tag set to "admin"
    filters: [{ field: "tag", key: "role", relation: "=", value: "admin" }],
    headings: { en: heading },
    contents: { en: content },
    // Web-specific settings
    chrome_web_badge: "https://shahirizadameatmarket.com/logo.png",
    web_url: `https://shahirizadameatmarket.com/admin?tab=orders`,
    // Data payload for app handling
    data: {
      type: "new_order",
      orderId: input.orderId,
      orderNumber: String(input.orderNumber),
      fulfillmentType: input.fulfillmentType,
      totalCents: input.totalCents,
    },
    // Push priority
    priority: 10,
    // Sound for urgency
    ios_sound: "default",
    android_sound: "default",
  };

  try {
    console.log(`📲 Sending admin push for new order #${input.orderNumber}`);

    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OneSignal admin push error: ${response.status} - ${errorText}`);
      return { success: false, error: `API error: ${response.status}` };
    }

    const result = await response.json();
    console.log(`✅ Admin push sent for order #${input.orderNumber}:`, result);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to send admin push:`, errorMessage);
    return { success: false, error: errorMessage };
  }
};
