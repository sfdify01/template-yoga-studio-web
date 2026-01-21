const DEFAULT_PLATFORM_FEE_RATE = 0.01; // 1%
const STRIPE_PERCENT_FEE = 0.029; // 2.9%
const STRIPE_FIXED_FEE_CENTS = 30; // $0.30

// Uber Direct maximum tip limit (in cents)
// API error: "Tip exceeds max amount of 2000"
const UBER_MAX_TIP_CENTS = 2000; // $20.00

export { DEFAULT_PLATFORM_FEE_RATE, STRIPE_PERCENT_FEE, STRIPE_FIXED_FEE_CENTS, UBER_MAX_TIP_CENTS };

/**
 * Estimate Stripe's processing fee for a payment amount (in cents).
 * Uses the standard 2.9% + $0.30 calculation.
 */
export function estimateStripeProcessingFee(amountCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return 0;
  }

  return Math.max(
    Math.round(amountCents * STRIPE_PERCENT_FEE + STRIPE_FIXED_FEE_CENTS),
    0
  );
}

/**
 * Calculate Tabsy's platform fee (in cents) using a configurable rate.
 */
export function calculatePlatformFee(
  subtotalCents: number,
  feeRate: number = DEFAULT_PLATFORM_FEE_RATE
): number {
  if (!Number.isFinite(subtotalCents) || subtotalCents <= 0) {
    return 0;
  }

  const rate = feeRate > 0 ? feeRate : DEFAULT_PLATFORM_FEE_RATE;
  return Math.max(Math.round(subtotalCents * rate), 0);
}
