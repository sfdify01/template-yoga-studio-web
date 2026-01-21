-- Complete setup script for TEST Supabase (pbzpqsdjaiynrpjpubai)
-- Run this entire script in the SQL Editor

-- 1. Create tenants table if it doesn't exist
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

-- 2. Disable RLS temporarily to insert data
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;

-- 3. Insert or update the Shahirizada tenant
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
  'Shahirizada Fresh Market - TEST',
  'USD',
  true,
  'acct_1SRs0KELeuKYRuTW',
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
  default_currency = EXCLUDED.default_currency,
  ordering_enabled = EXCLUDED.ordering_enabled,
  stripe_connect_account_id = EXCLUDED.stripe_connect_account_id,
  stripe_application_fee_bps = EXCLUDED.stripe_application_fee_bps,
  support_email = EXCLUDED.support_email,
  config = EXCLUDED.config;

-- 4. Re-enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 5. Create read policy for public access
DROP POLICY IF EXISTS "Allow public read tenants" ON public.tenants;
CREATE POLICY "Allow public read tenants" ON public.tenants
  FOR SELECT
  USING (true);

-- 6. Update menu_items to ensure they have the correct tenant_id
UPDATE public.menu_items
SET tenant_id = 'aa87f0bc-06cf-4b33-a4d8-7158b1347cae'::uuid
WHERE tenant_id IS NULL OR tenant_id != 'aa87f0bc-06cf-4b33-a4d8-7158b1347cae'::uuid;

-- 7. Ensure menu_items RLS allows public read
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read menu_items" ON public.menu_items;
CREATE POLICY "Allow public read menu_items" ON public.menu_items
  FOR SELECT
  USING (true);

-- 8. Verify everything is set up
DO $$
DECLARE
  tenant_count INTEGER;
  menu_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tenant_count FROM public.tenants WHERE slug = 'shahirizada';
  SELECT COUNT(*) INTO menu_count FROM public.menu_items WHERE tenant_id = 'aa87f0bc-06cf-4b33-a4d8-7158b1347cae'::uuid;

  RAISE NOTICE 'Setup Complete!';
  RAISE NOTICE 'Tenants found: %', tenant_count;
  RAISE NOTICE 'Menu items found: %', menu_count;
END $$;

-- 9. Show the results
SELECT 'Tenant Setup' as status, id, slug, name FROM public.tenants WHERE slug = 'shahirizada';
SELECT 'Menu Items Count' as status, COUNT(*) as count FROM public.menu_items WHERE tenant_id = 'aa87f0bc-06cf-4b33-a4d8-7158b1347cae'::uuid;
SELECT 'Sample Menu Items' as status, name, category, price_cents FROM public.menu_items WHERE tenant_id = 'aa87f0bc-06cf-4b33-a4d8-7158b1347cae'::uuid LIMIT 5;