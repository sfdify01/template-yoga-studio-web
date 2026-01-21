-- Run this in the Supabase SQL Editor for the TEST project (pbzpqsdjaiynrpjpubai)
-- This will create the tenant that matches the menu items

-- First, check if tenants table exists, if not create it
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  default_currency TEXT DEFAULT 'USD',
  ordering_enabled BOOLEAN DEFAULT true,
  stripe_connect_account_id TEXT,
  stripe_application_fee_bps INTEGER DEFAULT 0,
  support_email TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Create read policy if it doesn't exist
DROP POLICY IF EXISTS "Allow public read tenants" ON public.tenants;
CREATE POLICY "Allow public read tenants" ON public.tenants
  FOR SELECT
  USING (true);

-- Insert the Shahirizada tenant with the ID that menu items are using
INSERT INTO public.tenants (
  id,
  slug,
  name,
  default_currency,
  ordering_enabled,
  stripe_connect_account_id,
  stripe_application_fee_bps,
  support_email,
  config
) VALUES (
  'aa87f0bc-06cf-4b33-a4d8-7158b1347cae'::uuid,
  'shahirizada',
  'Shahirizada Fresh Market',
  'USD',
  true,
  'acct_1SRs0KELeuKYRuTW', -- Test Stripe Connect ID
  100,
  'support@shahirizadameatmarket.com',
  jsonb_build_object(
    'theme', jsonb_build_object(
      'primaryColor', '#6B0F1A',
      'accentColor', '#E8D5BA'
    ),
    'features', jsonb_build_object(
      'loyalty', true,
      'blog', true,
      'pickup', true,
      'delivery', true,
      'catering', true,
      'events', true
    ),
    'delivery', jsonb_build_object(
      'provider', 'doordash',
      'maxDistance', 8
    ),
    'social', jsonb_build_object(
      'instagram', '@akmammet',
      'facebook', 'shahirizadameatmarket'
    )
  )
) ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  ordering_enabled = EXCLUDED.ordering_enabled,
  stripe_connect_account_id = EXCLUDED.stripe_connect_account_id,
  stripe_application_fee_bps = EXCLUDED.stripe_application_fee_bps,
  support_email = EXCLUDED.support_email,
  config = EXCLUDED.config;

-- Verify the data
SELECT 'Tenant created:' as status, name, slug FROM public.tenants WHERE slug = 'shahirizada';
SELECT 'Menu items count:' as status, COUNT(*) as count FROM public.menu_items WHERE tenant_id = 'aa87f0bc-06cf-4b33-a4d8-7158b1347cae'::uuid;