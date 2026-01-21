-- Add Stripe Connect fields to tenants table
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_application_fee_bps integer DEFAULT 100;

-- Update shahirizada tenant with Stripe Connect account
UPDATE public.tenants
SET
  stripe_connect_account_id = 'acct_1SSF91CkkC486fCc',
  stripe_application_fee_bps = 100
WHERE slug = 'shahirizada';

COMMENT ON COLUMN public.tenants.stripe_connect_account_id IS 'Stripe Connect account ID for marketplace destination charges';
COMMENT ON COLUMN public.tenants.stripe_application_fee_bps IS 'Platform application fee in basis points (100 = 1%)';
