-- Fix payment_intents schema to match Edge Function expectations
-- Drop and recreate with correct schema for Stripe Connect integration

DROP TABLE IF EXISTS public.payment_intents CASCADE;

CREATE TABLE public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_payment_intent_id text NOT NULL UNIQUE,
  status text NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  application_fee_amount_cents integer NOT NULL DEFAULT 0,
  transfer_destination text,
  customer_email text,
  customer_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payment_intents_tenant_idx ON public.payment_intents(tenant_id);
CREATE INDEX payment_intents_stripe_id_idx ON public.payment_intents(stripe_payment_intent_id);

-- Enable RLS
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- Allow service role to do anything
CREATE POLICY payment_intents_service_role_all ON public.payment_intents
  FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

-- Allow authenticated users to view their own payment intents
CREATE POLICY payment_intents_user_read ON public.payment_intents
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    customer_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE public.payment_intents IS 'Stripe Connect payment intents for order payments';
