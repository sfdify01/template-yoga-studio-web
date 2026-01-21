import Stripe from "npm:stripe@15.11.0";

export type StripeMode = "prod" | "test";

const stripeClientCache: Record<StripeMode, Stripe | null> = {
  prod: null,
  test: null,
};

const STRIPE_SECRET_KEYS: Record<StripeMode, string[]> = {
  prod: ["STRIPE_SECRET_KEY", "STRIPE_SECRET__KEY"],
  test: ["STRIPE_TEST_SECRET_KEY", "STRIPE_SECRET_KEY_TEST", "STRIPE_SECRET_KEY_SANDBOX"],
};

type TenantStripeConfig = {
  id: string;
  slug: string;
  name: string;
  default_currency: string;
  stripe_connect_account_id: string | null;
  stripe_application_fee_bps: number | null;
};

function resolveStripeSecret(mode: StripeMode): string {
  for (const key of STRIPE_SECRET_KEYS[mode]) {
    const value = Deno.env.get(key);
    if (value && `${value}`.trim().length > 0) return value;
  }
  // For test mode, allow fallback to prod secret if no test secret provided (useful for single-env setups)
  if (mode === "test") {
    for (const key of STRIPE_SECRET_KEYS.prod) {
      const value = Deno.env.get(key);
      if (value && `${value}`.trim().length > 0) return value;
    }
  }
  throw new Error(`Stripe secret key not configured for mode=${mode}`);
}

function getStripeClient(mode: StripeMode = "prod"): Stripe {
  const cached = stripeClientCache[mode];
  if (cached) return cached;

  const secretKey = resolveStripeSecret(mode);
  const client = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });
  stripeClientCache[mode] = client;
  return client;
}

export type ConnectPaymentIntentParams = {
  tenant: TenantStripeConfig;
  amountCents: number;
  currency?: string;
  /**
   * The actual platform fee (1%) that Tabsy charges.
   * This appears as "TABSY LLC application fee" in Stripe Dashboard.
   * Keep this ONLY for the platform fee, NOT delivery fees.
   */
  applicationFeeAmountCents?: number;
  /**
   * The amount to transfer to the merchant.
   * If not specified, transfers (total - application_fee).
   * Use this to precisely control what merchant receives,
   * allowing delivery fees to stay with Tabsy without showing as "application fee".
   */
  merchantTransferAmountCents?: number;
  metadata?: Record<string, string>;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  mode?: StripeMode;
  connectAccountIdOverride?: string | null;
};

/**
 * Create a PaymentIntent using Stripe Connect destination charges pattern.
 *
 * For marketplace business model:
 * - Platform collects payment (we bear liability for disputes/refunds)
 * - Funds transfer to connected account automatically
 * - Platform takes application fee (1%)
 * - on_behalf_of makes connected account the merchant of record (appears on statements)
 *
 * This aligns with Stripe's recommended marketplace architecture:
 * https://docs.stripe.com/connect/charges
 */
export async function createConnectPaymentIntent(params: ConnectPaymentIntentParams) {
  const mode: StripeMode = params.mode ?? "prod";
  const stripe = getStripeClient(mode);
  const destination = params.connectAccountIdOverride ?? params.tenant.stripe_connect_account_id;
  if (!destination) {
    throw new Error("Tenant does not have a Stripe Connect account configured");
  }

  const metadata = {
    tenant_id: params.tenant.id,
    tenant_slug: params.tenant.slug,
    ...Object.fromEntries(
      Object.entries(params.metadata ?? {}).map(([key, value]) => [key, value?.toString() ?? ""]),
    ),
  } satisfies Record<string, string>;

  // IMPORTANT: Stripe Connect destination charges have TWO mutually exclusive approaches:
  // 1. application_fee_amount: Stripe calculates transfer = charge - fee (fee shows as "application fee")
  // 2. transfer_data.amount: Explicit transfer amount (platform keeps the rest, no "application fee" label)
  //
  // You CANNOT use both simultaneously!

  const useExplicitTransfer = params.merchantTransferAmountCents !== undefined && params.merchantTransferAmountCents > 0;

  const transferData: { destination: string; amount?: number } = { destination };
  if (useExplicitTransfer) {
    transferData.amount = Math.round(params.merchantTransferAmountCents!);
  }

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(params.amountCents),
    currency: (params.currency ?? params.tenant.default_currency ?? "usd").toLowerCase(),
    // Use explicit payment_method_types for Connect accounts instead of automatic_payment_methods
    // This ensures compatibility even if connected account hasn't configured automatic payment methods
    // Include 'link' to enable Stripe Link for returning customers with saved payment methods
    payment_method_types: ['card', 'link'],
    description: `${params.tenant.name} order`,

    // Destination charges pattern for marketplace
    transfer_data: transferData,

    // Makes connected account the merchant of record
    on_behalf_of: destination,

    // MUTUALLY EXCLUSIVE with transfer_data.amount!
    // Only use application_fee_amount when NOT using explicit transfer amount
    application_fee_amount: useExplicitTransfer
      ? undefined  // Platform keeps (charge - transfer_data.amount) automatically
      : (params.applicationFeeAmountCents && params.applicationFeeAmountCents > 0
          ? Math.round(params.applicationFeeAmountCents)
          : undefined),

    metadata,
    receipt_email: params.customer?.email || undefined,
  });

  return intent;
}

export async function retrieveStripePaymentIntent(paymentIntentId: string, mode: StripeMode = "prod") {
  const stripe = getStripeClient(mode);
  return stripe.paymentIntents.retrieve(paymentIntentId);
}
