import Stripe from "npm:stripe@15.11.0";

/**
 * Stripe Connect Account Management
 *
 * Handles:
 * - Creating new Connect accounts
 * - Account onboarding (Account Links)
 * - Account verification status
 * - Account capabilities
 *
 * Documentation:
 * - https://docs.stripe.com/connect/accounts
 * - https://docs.stripe.com/connect/onboarding/quickstart
 * - https://docs.stripe.com/connect/capabilities
 */

export type ConnectAccountType = "express" | "standard" | "custom";

export type CreateAccountParams = {
  type: ConnectAccountType;
  email: string;
  country: string;
  businessName?: string;
  businessType?: Stripe.AccountCreateParams.BusinessType;
  metadata?: Record<string, string>;
};

export type AccountLinkParams = {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
  type?: "account_onboarding" | "account_update";
};

/**
 * Create a new Stripe Connect account
 *
 * Express accounts (recommended for most use cases):
 * - Fastest onboarding
 * - Stripe handles compliance and verification
 * - Merchant sees Stripe branding
 * - Platform has less liability
 *
 * Standard accounts:
 * - Full Stripe dashboard access for merchant
 * - Independent relationship with Stripe
 * - More control for merchant
 *
 * Custom accounts:
 * - Most control for platform
 * - Platform handles all UX
 * - Most liability for platform
 */
export async function createConnectAccount(
  stripe: Stripe,
  params: CreateAccountParams,
): Promise<Stripe.Account> {
  const accountParams: Stripe.AccountCreateParams = {
    type: params.type,
    email: params.email,
    country: params.country,
    capabilities: {
      // Enable card payments
      card_payments: { requested: true },
      // Enable transfers (required for destination charges)
      transfers: { requested: true },
    },
    metadata: params.metadata || {},
  };

  // For Express accounts, set business profile
  if (params.type === "express" && params.businessName) {
    accountParams.business_profile = {
      name: params.businessName,
    };
  }

  if (params.businessType) {
    accountParams.business_type = params.businessType;
  }

  const account = await stripe.accounts.create(accountParams);

  console.log(`[Connect] Created ${params.type} account: ${account.id}`);

  return account;
}

/**
 * Create an Account Link for onboarding
 *
 * Account Links are short-lived URLs (expires in ~5 minutes) that
 * redirect merchants to Stripe's hosted onboarding flow.
 *
 * The merchant will complete:
 * - Business information
 * - Bank account details
 * - Identity verification
 * - Tax information (if applicable)
 *
 * After completion, they're redirected to returnUrl.
 * If they need to return later, use refreshUrl.
 */
export async function createAccountLink(
  stripe: Stripe,
  params: AccountLinkParams,
): Promise<Stripe.AccountLink> {
  const accountLink = await stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: params.type || "account_onboarding",
  });

  console.log(`[Connect] Created account link for ${params.accountId}`);

  return accountLink;
}

/**
 * Retrieve Connect account details
 *
 * Use this to check:
 * - charges_enabled: Can accept payments
 * - payouts_enabled: Can receive payouts
 * - requirements: What info is still needed
 * - capabilities: What payment methods are enabled
 */
export async function getConnectAccount(
  stripe: Stripe,
  accountId: string,
): Promise<Stripe.Account> {
  return await stripe.accounts.retrieve(accountId);
}

/**
 * Check if account is fully onboarded and can accept payments
 */
export function isAccountReady(account: Stripe.Account): boolean {
  return (
    account.charges_enabled === true &&
    account.payouts_enabled === true &&
    (account.requirements?.currently_due?.length || 0) === 0
  );
}

/**
 * Get human-readable account status
 */
export function getAccountStatus(account: Stripe.Account): {
  canAcceptPayments: boolean;
  canReceivePayouts: boolean;
  requiresAction: boolean;
  pendingVerification: boolean;
  message: string;
} {
  const currentlyDue = account.requirements?.currently_due || [];
  const pendingVerification = (account.requirements?.pending_verification || []).length > 0;

  let message = "Account is active and ready";

  if (!account.charges_enabled) {
    message = "Account cannot accept payments yet";
  } else if (!account.payouts_enabled) {
    message = "Account can accept payments but cannot receive payouts yet";
  } else if (currentlyDue.length > 0) {
    message = `Action required: ${currentlyDue.length} items need attention`;
  } else if (pendingVerification) {
    message = "Verification in progress";
  }

  return {
    canAcceptPayments: account.charges_enabled === true,
    canReceivePayouts: account.payouts_enabled === true,
    requiresAction: currentlyDue.length > 0,
    pendingVerification,
    message,
  };
}

/**
 * Update Connect account details
 */
export async function updateConnectAccount(
  stripe: Stripe,
  accountId: string,
  updates: Stripe.AccountUpdateParams,
): Promise<Stripe.Account> {
  return await stripe.accounts.update(accountId, updates);
}

/**
 * Delete (close) a Connect account
 *
 * WARNING: This is irreversible. Use carefully.
 * The account must have no pending balances.
 */
export async function deleteConnectAccount(
  stripe: Stripe,
  accountId: string,
): Promise<Stripe.DeletedAccount> {
  return await stripe.accounts.del(accountId);
}

/**
 * Create a login link for Express accounts
 *
 * Express accounts can access a limited Stripe dashboard.
 * This generates a single-use link (expires in ~5 minutes).
 */
export async function createLoginLink(
  stripe: Stripe,
  accountId: string,
): Promise<Stripe.LoginLink> {
  return await stripe.accounts.createLoginLink(accountId);
}

/**
 * List all Connect accounts for the platform
 */
export async function listConnectAccounts(
  stripe: Stripe,
  limit: number = 10,
): Promise<Stripe.ApiList<Stripe.Account>> {
  return await stripe.accounts.list({ limit });
}
