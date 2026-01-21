-- Ensure tenants table has all required columns (idempotent)
BEGIN;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS default_currency text;

UPDATE public.tenants
  SET default_currency = 'USD'
  WHERE default_currency IS NULL;

ALTER TABLE public.tenants
  ALTER COLUMN default_currency SET NOT NULL,
  ALTER COLUMN default_currency SET DEFAULT 'USD';

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS ordering_enabled boolean;

UPDATE public.tenants
  SET ordering_enabled = true
  WHERE ordering_enabled IS NULL;

ALTER TABLE public.tenants
  ALTER COLUMN ordering_enabled SET NOT NULL,
  ALTER COLUMN ordering_enabled SET DEFAULT true;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_application_fee_bps integer;

UPDATE public.tenants
  SET stripe_application_fee_bps = coalesce(stripe_application_fee_bps, 0);

ALTER TABLE public.tenants
  ALTER COLUMN stripe_application_fee_bps SET NOT NULL,
  ALTER COLUMN stripe_application_fee_bps SET DEFAULT 0;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS support_email text;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS support_phone text;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

UPDATE public.tenants
  SET created_at = coalesce(created_at, now());

ALTER TABLE public.tenants
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.tenants
  SET updated_at = coalesce(updated_at, now());

ALTER TABLE public.tenants
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

COMMIT;
