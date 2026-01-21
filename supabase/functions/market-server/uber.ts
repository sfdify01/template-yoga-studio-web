import { nowIso } from "./utils.ts";

export type UberMode = "prod" | "test";

const getUberEnv = (primary: string, fallback?: string) => {
  const value = Deno.env.get(primary);
  if (value && `${value}`.length > 0) return value;
  if (fallback) {
    const alt = Deno.env.get(fallback);
    if (alt && `${alt}`.length > 0) return alt;
  }
  return undefined;
};

type UberConfig = {
  authUrl: string;
  apiUrl: string;
  customerId: string;
  clientId: string;
  clientSecret: string;
};

const DEFAULT_AUTH_URL = "https://auth.uber.com/oauth/v2/token";
const DEFAULT_API_URL = "https://api.uber.com/v1";

// Per Uber Direct docs: both test and production use api.uber.com
// TEST credentials automatically route to sandbox behavior (no real deliveries, uses Robo Courier)
// PROD credentials route to production (real deliveries, real couriers)
const uberConfigCache: Record<UberMode, UberConfig> = {
  prod: {
    authUrl: DEFAULT_AUTH_URL,
    apiUrl: DEFAULT_API_URL,
    customerId: "",
    clientId: "",
    clientSecret: "",
  },
  test: {
    authUrl: DEFAULT_AUTH_URL,
    apiUrl: DEFAULT_API_URL,
    customerId: "",
    clientId: "",
    clientSecret: "",
  },
};

function resolveUberConfig(mode: UberMode = "prod"): UberConfig {
  const prefix = mode === "test" ? "UBER_DIRECT_TEST_" : "UBER_DIRECT_";
  const fallbackPrefix = mode === "test" ? "UBER_TEST_" : "UBER_";

  const cached = uberConfigCache[mode];

  const authUrl =
    getUberEnv(`${prefix}AUTH_URL`, `${fallbackPrefix}AUTH_URL`) ??
    getUberEnv("UBER_DIRECT_AUTH_URL", "UBER_AUTH_URL") ??
    cached.authUrl;

  // Both test and prod use api.uber.com - credentials determine sandbox vs production
  const apiUrl =
    getUberEnv(`${prefix}API_URL`, `${fallbackPrefix}API_URL`) ??
    getUberEnv("UBER_DIRECT_API_URL", "UBER_API_URL") ??
    cached.apiUrl;

  const customerId =
    getUberEnv(`${prefix}CUSTOMER_ID`, `${fallbackPrefix}CUSTOMER_ID`) ??
    getUberEnv("UBER_DIRECT_CUSTOMER_ID", "UBER_CUSTOMER_ID") ??
    cached.customerId;

  const clientId =
    getUberEnv(`${prefix}CLIENT_ID`, `${fallbackPrefix}CLIENT_ID`) ??
    getUberEnv("UBER_DIRECT_CLIENT_ID", "UBER_CLIENT_ID") ??
    cached.clientId;

  const clientSecret =
    getUberEnv(`${prefix}CLIENT_SECRET`, `${fallbackPrefix}CLIENT_SECRET`) ??
    getUberEnv("UBER_DIRECT_CLIENT_SECRET", "UBER_CLIENT_SECRET") ??
    cached.clientSecret;

  const resolved: UberConfig = {
    authUrl: authUrl || DEFAULT_AUTH_URL,
    apiUrl: apiUrl || DEFAULT_API_URL,
    customerId: customerId ?? "",
    clientId: clientId ?? "",
    clientSecret: clientSecret ?? "",
  };

  uberConfigCache[mode] = resolved;

  // Debug logging for troubleshooting
  console.log(`🔧 Uber config resolved for mode=${mode}:`, {
    apiUrl: resolved.apiUrl,
    customerId: resolved.customerId ? `${resolved.customerId.slice(0, 8)}...` : "(not set)",
    clientId: resolved.clientId ? `${resolved.clientId.slice(0, 8)}...` : "(not set)",
    hasSecret: Boolean(resolved.clientSecret),
  });

  return resolved;
}

if (!resolveUberConfig("prod").customerId || !resolveUberConfig("prod").clientId || !resolveUberConfig("prod").clientSecret) {
  console.warn("Uber Direct production environment variables are not fully configured. Delivery quoting will be disabled.");
}

type StructuredAddress = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip: string;
  country?: string;
};

type PickupDetails = {
  name: string;
  phone: string;
  address: StructuredAddress;
  latitude?: number | null;
  longitude?: number | null;
};

type QuoteResponse = {
  feeCents: number;
  currency: string;
  quoteId: string;
  expiresAt: string;
  pickupAddressPayload: string;
  dropoffAddressPayload: string;
  etaMinutes?: number;
};

type DeliveryRequest = {
  quoteId: string;
  pickup: PickupDetails;
  pickupAddressPayload?: string;
  dropoff: {
    name: string;
    phone: string;
    address: StructuredAddress;
    latitude?: number | null;
    longitude?: number | null;
    notes?: string | null;
    businessName?: string | null;
    sellerNotes?: string | null;
  };
  dropoffAddressPayload?: string;
  manifest: {
    reference?: string | null;
    total_value?: number;
    description?: string | null;
    items: Array<{
      name: string;
      quantity: number;
      price_cents?: number;
      size?: string;
      dimensions?: {
        length?: number;
        width?: number;
        height?: number;
        depth?: number;
      };
    }>;
  };
  undeliverableAction?: "return" | "leave_at_door";
  deliverableAction?: "deliverable_action_meet_at_door" | "deliverable_action_leave_at_door";
  externalId?: string;
  externalStoreId?: string;
  tip?: number;
  testSpecifications?: Record<string, unknown>;
  prepTimeMinutes?: number;
};

type DeliveryResponse = {
  deliveryId: string;
  status: string;
  trackingUrl?: string;
  quoteId: string;
  feeCents?: number;
  etaMinutes?: number;
  raw: any;
};

type DeliveryStatusResponse = {
  id: string;
  status: DeliveryStatus;
  trackingUrl?: string;
  pickupEta?: string | null;
  dropoffEta?: string | null;
  courier?: {
    name?: string;
    phone?: string;
    location?: {
      lat: number;
      lng: number;
    };
    img_href?: string;
  };
  pickup?: {
    status?: string;
    status_timestamp?: string;
  };
  dropoff?: {
    status?: string;
    status_timestamp?: string;
  };
  raw: any;
};

const tokenCache: Record<UberMode, { token: string; expiresAt: number } | null> = {
  prod: null,
  test: null,
};

const isValidCoordinate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * Parse Uber API error response and return a clean, user-friendly error message.
 * Extracts the error code to maintain frontend pattern matching compatibility.
 */
function parseUberErrorResponse(responseText: string, statusCode: number): string {
  try {
    const errorData = JSON.parse(responseText);
    const code = errorData.code || '';
    const message = errorData.message || errorData.error || 'Unknown error';
    
    // Log full error response for debugging
    console.error("❌ Uber API error response:", JSON.stringify(errorData, null, 2));
    
    // Uber returns invalid params in a 'params' object
    // e.g. { code: "invalid_params", params: { dropoff_phone_number: "must be valid" } }
    const params = errorData.params || errorData.metadata?.invalid_params;
    let paramDetails = '';
    if (params && typeof params === 'object') {
      paramDetails = Object.entries(params)
        .map(([key, val]) => `${key}: ${val}`)
        .join(', ');
    }

    // Include the code in a consistent format for frontend pattern matching
    // Format: "[error_code] Human readable message (param details)"
    if (code) {
      return paramDetails 
        ? `[${code}] ${message} (${paramDetails})`
        : `[${code}] ${message}`;
    }
    return message;
  } catch {
    // If not valid JSON, return a clean message without raw text dump
    if (responseText && responseText.length < 200) {
      return responseText;
    }
    return `Service error (HTTP ${statusCode})`;
  }
}

function canUseUber(mode: UberMode = "prod"): boolean {
  const cfg = resolveUberConfig(mode);
  return Boolean(cfg.customerId && cfg.clientId && cfg.clientSecret);
}

export function isUberConfigured(mode: UberMode = "prod") {
  return canUseUber(mode);
}

async function getUberAccessToken(mode: UberMode = "prod"): Promise<string> {
  if (!canUseUber(mode)) throw new Error("Uber Direct credentials not configured");
  const cfg = resolveUberConfig(mode);

  const cached = tokenCache[mode];
  if (cached && cached.expiresAt - 60_000 > Date.now()) {
    return cached.token;
  }

  const body = new URLSearchParams();
  body.set("client_id", cfg.clientId);
  body.set("client_secret", cfg.clientSecret);
  body.set("grant_type", "client_credentials");
  body.set("scope", "eats.deliveries");

  const response = await fetch(cfg.authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    const cleanError = parseUberErrorResponse(text, response.status);
    throw new Error(`Uber auth failed: ${cleanError}`);
  }

  const data = await response.json();
  tokenCache[mode] = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 0) * 1000,
  };
  return data.access_token as string;
}

function formatAddress(address: StructuredAddress) {
  // Normalize embedded suites so Uber gets street + unit on separate lines
  const trimmedLine1 = address.line1.trim();
  const trimmedLine2 = address.line2?.trim() ?? "";

  let streetLine1 = trimmedLine1;
  let streetLine2 = trimmedLine2;

  // If the suite/unit is part of line1 (e.g. "3124 Illinois Rte 59 #158"), split it out
  if (!streetLine2) {
    const match = trimmedLine1.match(/^(.*?)(\s+#?\s*[^\s].*)$/);
    if (match && match[1].trim().length && match[2].trim().startsWith("#")) {
      streetLine1 = match[1].trim();
      streetLine2 = match[2].trim();
    }
  }

  const street = streetLine2 ? [streetLine1, streetLine2] : [streetLine1];

  return JSON.stringify({
    street_address: street,
    city: address.city,
    state: address.state,
    zip_code: address.zip,
    country: address.country ?? "US",
  });
}

export async function quoteUberDelivery(
  pickup: PickupDetails,
  dropoff: StructuredAddress & { latitude?: number | null; longitude?: number | null },
  mode: UberMode = "prod",
): Promise<QuoteResponse> {
  const cfg = resolveUberConfig(mode);
  const token = await getUberAccessToken(mode);

  // Uber Direct API expects address fields as stringified JSON, NOT as JSON objects.
  // We keep the pickup_ready_dt buffer to help with courier availability.
  const pickupAddressPayload = formatAddress(pickup.address);
  const dropoffAddressPayload = formatAddress(dropoff);

  // Set a default pickup time to allow for prep (e.g. 20 mins)
  // This helps avoid "couriers busy" errors for immediate requests in Production
  // In Test mode, we want immediate availability for testing
  const pickupReadyDt = mode === "prod"
    ? new Date(Date.now() + 20 * 60 * 1000).toISOString()
    : new Date().toISOString();

  const body: Record<string, unknown> = {
    pickup_address: pickupAddressPayload,
    dropoff_address: dropoffAddressPayload,
    pickup_ready_dt: pickupReadyDt,
  };

  if (isValidCoordinate(pickup.latitude) && isValidCoordinate(pickup.longitude)) {
    body.pickup_latitude = pickup.latitude;
    body.pickup_longitude = pickup.longitude;
  }
  if (isValidCoordinate(dropoff.latitude) && isValidCoordinate(dropoff.longitude)) {
    body.dropoff_latitude = dropoff.latitude;
    body.dropoff_longitude = dropoff.longitude;
  }

  const response = await fetch(`${cfg.apiUrl}/customers/${cfg.customerId}/delivery_quotes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    const cleanError = parseUberErrorResponse(text, response.status);
    throw new Error(`Uber quote failed: ${cleanError}`);
  }

  const data = await response.json();
  return {
    feeCents: Number(data.fee ?? 0),
    currency: data.currency ?? data.currency_type ?? "usd",
    quoteId: data.id,
    expiresAt: data.expires ?? nowIso(),
    etaMinutes: data.pickup_duration ?? data.duration,
    pickupAddressPayload,
    dropoffAddressPayload,
  };
}

export async function createUberDelivery(req: DeliveryRequest, mode: UberMode = "prod"): Promise<DeliveryResponse> {
  const cfg = resolveUberConfig(mode);
  const token = await getUberAccessToken(mode);

  // Calculate pickup ready time with optional prep window
  const prepMinutes = Math.max(1, req.prepTimeMinutes ?? 25);
  const pickupReadyTime = new Date(Date.now() + prepMinutes * 60 * 1000);

  const payload: Record<string, unknown> = {
    quote_id: req.quoteId,
    pickup_address: req.pickupAddressPayload ?? formatAddress(req.pickup.address),
    pickup_business_name: req.pickup.name,
    pickup_name: req.pickup.name,
    pickup_phone_number: req.pickup.phone,
    // Set pickup ready time for ASAP delivery with preparation time
    // As per Uber Direct docs: pickup_ready_dt should be t0 + prep_time
    pickup_ready_dt: pickupReadyTime.toISOString(),
    dropoff_address: req.dropoffAddressPayload ?? formatAddress(req.dropoff.address),
    dropoff_name: req.dropoff.name,
    dropoff_phone_number: req.dropoff.phone,
    dropoff_business_name: req.dropoff.businessName ?? undefined,
    dropoff_notes: req.dropoff.notes ?? undefined,
    dropoff_seller_notes: req.dropoff.sellerNotes ?? undefined,
    manifest_items: req.manifest.items.map((item) => ({
      name: item.name,
      // Uber requires integer quantities - use 1 for weight-based items (actual weight is in the name)
      quantity: Math.max(1, Math.round(item.quantity)),
      size: item.size ?? "medium",
      price: item.price_cents ?? 0,
      dimensions: item.dimensions ? {
        length: item.dimensions.length ?? undefined,
        width: item.dimensions.width ?? undefined,
        height: item.dimensions.height ?? undefined,
        depth: item.dimensions.depth ?? undefined,
      } : undefined,
    })),
    manifest_reference: req.manifest.reference ?? undefined,
    manifest_description: req.manifest.description ?? undefined,
    manifest_total_value: req.manifest.total_value ?? undefined,
    undeliverable_action: req.undeliverableAction ?? "return",
    deliverable_action: req.deliverableAction ?? "deliverable_action_meet_at_door",
    external_id: req.externalId,
    external_store_id: req.externalStoreId ?? undefined,
    tip: req.tip ?? undefined,
  };

  if (isValidCoordinate(req.pickup.latitude) && isValidCoordinate(req.pickup.longitude)) {
    payload.pickup_latitude = req.pickup.latitude;
    payload.pickup_longitude = req.pickup.longitude;
  }
  if (isValidCoordinate(req.dropoff.latitude) && isValidCoordinate(req.dropoff.longitude)) {
    payload.dropoff_latitude = req.dropoff.latitude;
    payload.dropoff_longitude = req.dropoff.longitude;
  }
  if (req.testSpecifications) {
    payload.test_specifications = req.testSpecifications;
    console.log("🤖 Robo Courier enabled for test environment:", JSON.stringify(req.testSpecifications));
  } else {
    console.log("⚠️ No testSpecifications provided - Robo Courier NOT enabled (mode:", mode, ")");
  }

  console.log("🚚 Creating Uber delivery with payload:", JSON.stringify({
    ...payload,
    // Log key fields for debugging
    _debug: {
      mode,
      hasTestSpecs: !!req.testSpecifications,
      pickupReady: payload.pickup_ready_dt,
      quoteId: payload.quote_id,
    }
  }));

  const response = await fetch(`${cfg.apiUrl}/customers/${cfg.customerId}/deliveries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    const cleanError = parseUberErrorResponse(text, response.status);
    throw new Error(`Uber delivery failed: ${cleanError}`);
  }

  const data = await response.json();
  return {
    deliveryId: data.id,
    status: data.status ?? "pending",
    trackingUrl: data.tracking_url,
    quoteId: data.quote_id ?? req.quoteId,
    feeCents: data.fee ?? undefined,
    etaMinutes: data.duration ?? undefined,
    raw: data,
  };
}

export async function getUberDeliveryStatus(deliveryId: string, mode: UberMode = "prod"): Promise<DeliveryStatusResponse> {
  if (!deliveryId) {
    throw new Error("deliveryId is required");
  }
  const cfg = resolveUberConfig(mode);
  const token = await getUberAccessToken(mode);
  const response = await fetch(`${cfg.apiUrl}/customers/${cfg.customerId}/deliveries/${deliveryId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const cleanError = parseUberErrorResponse(text, response.status);
    throw new Error(`Uber delivery lookup failed: ${cleanError}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    status: data.status ?? "pending",
    trackingUrl: data.tracking_url ?? data.trackingLink ?? null,
    pickupEta: data.pickup_eta ?? data.pickup?.eta ?? null,
    dropoffEta: data.dropoff_eta ?? data.dropoff?.eta ?? null,
    courier: data.courier ?? null,
    pickup: data.pickup ?? null,
    dropoff: data.dropoff ?? null,
    raw: data,
  };
}

/**
 * Update Uber Direct delivery to notify that order is ready for pickup
 * Call this when merchant marks order as "ready"
 * This tells Uber the courier should come now (pickup_ready_dt = now)
 */
export async function updateUberPickupReady(
  deliveryId: string,
  mode: UberMode = "prod"
): Promise<{ success: boolean; error?: string }> {
  if (!deliveryId) {
    return { success: false, error: "deliveryId is required" };
  }

  if (!canUseUber(mode)) {
    return { success: false, error: "Uber Direct not configured" };
  }

  try {
    const cfg = resolveUberConfig(mode);
    const token = await getUberAccessToken(mode);

    // Set pickup_ready_dt to NOW - tells Uber the order is ready for immediate pickup
    const pickupReadyNow = new Date().toISOString();

    console.log(`📦 Updating Uber delivery ${deliveryId} - order ready for pickup (pickup_ready_dt = ${pickupReadyNow})`);

    const response = await fetch(
      `${cfg.apiUrl}/customers/${cfg.customerId}/deliveries/${deliveryId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickup_ready_dt: pickupReadyNow,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(`❌ Uber update pickup ready failed: ${response.status} ${text}`);

      // If delivery is already past pickup stage, treat as success
      if (response.status === 400 || response.status === 409) {
        console.log(`⚠️ Delivery ${deliveryId} may already be past pickup stage`);
        return { success: true };
      }

      return { success: false, error: `Update failed: ${response.status} - ${text}` };
    }

    const data = await response.json();
    console.log(`✅ Uber delivery ${deliveryId} updated - order ready for pickup`, {
      newPickupReady: data.pickup_ready,
      status: data.status,
    });

    return { success: true };
  } catch (error: any) {
    console.error(`❌ Error updating Uber pickup ready:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel an Uber Direct delivery
 * Used when merchant cancels an order that has an active delivery
 */
export async function cancelUberDelivery(deliveryId: string, mode: UberMode = "prod"): Promise<{ success: boolean; error?: string }> {
  if (!deliveryId) {
    return { success: false, error: "deliveryId is required" };
  }

  if (!canUseUber(mode)) {
    return { success: false, error: "Uber Direct not configured" };
  }

  try {
    const cfg = resolveUberConfig(mode);
    const token = await getUberAccessToken(mode);

    // Uber Direct uses POST to cancel deliveries
    const response = await fetch(
      `${cfg.apiUrl}/customers/${cfg.customerId}/deliveries/${deliveryId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(`❌ Uber cancel delivery failed: ${response.status} ${text}`);

      // If delivery is already completed or cancelled, treat as success
      if (response.status === 400 || response.status === 409) {
        console.log(`⚠️ Delivery ${deliveryId} may already be in terminal state`);
        return { success: true };
      }

      return { success: false, error: `Cancel failed: ${response.status}` };
    }

    console.log(`✅ Uber delivery ${deliveryId} cancelled successfully`);
    return { success: true };
  } catch (error: any) {
    console.error(`❌ Error cancelling Uber delivery:`, error);
    return { success: false, error: error.message };
  }
}
