-- CRITICAL: Run this IMMEDIATELY in test Supabase SQL editor
-- This fixes EVERYTHING - creates missing tables and tenant

-- 1. Create the KV store table that the edge function needs
CREATE TABLE IF NOT EXISTS public.kv_store_a05c3297 (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS and create policy
ALTER TABLE public.kv_store_a05c3297 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access to kv_store" ON public.kv_store_a05c3297;
CREATE POLICY "Allow public access to kv_store" ON public.kv_store_a05c3297
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Create tenants table if missing
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

-- 3. Disable RLS temporarily for insert
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;

-- 4. Insert the tenant (matching the menu items' tenant_id)
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
  config = EXCLUDED.config;

-- 5. Re-enable RLS with public read policy
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read tenants" ON public.tenants;
CREATE POLICY "Allow public read tenants" ON public.tenants
  FOR SELECT USING (true);

-- 6. Verify everything
SELECT 'KV Store Table' as check, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'kv_store_a05c3297') as exists;
SELECT 'Tenant' as check, COUNT(*) as count FROM public.tenants WHERE slug = 'shahirizada';
SELECT 'Menu Items' as check, COUNT(*) as count FROM public.menu_items WHERE tenant_id = 'aa87f0bc-06cf-4b33-a4d8-7158b1347cae'::uuid;