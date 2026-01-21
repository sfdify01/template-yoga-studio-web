const { createClient } = require('@supabase/supabase-js');

// Test Supabase
const testUrl = 'https://pbzpqsdjaiynrpjpubai.supabase.co';
const testServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXX.XXXX';

// You'll need the service role key for this
const testSupabase = createClient(testUrl, testServiceKey);

async function runMigration(sql) {
  const { data, error } = await testSupabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('Migration error:', error);
    return false;
  }
  return true;
}

async function main() {
  console.log('Setting up test database schema...');

  // Create tables for menu
  const createTablesSQL = `
    -- Create menu_items table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.menu_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price BIGINT NOT NULL,
      price_unit TEXT DEFAULT 'item',
      image_url TEXT,
      tags TEXT[],
      popular BOOLEAN DEFAULT false,
      available BOOLEAN DEFAULT true,
      display_order INTEGER DEFAULT 0,
      dietary_tags TEXT[],
      ingredients TEXT[],
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Create tenants table if it doesn't exist
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

    -- Enable RLS
    ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

    -- Create policies for public read
    CREATE POLICY "Allow public read menu_items" ON menu_items FOR SELECT USING (true);
    CREATE POLICY "Allow public read tenants" ON tenants FOR SELECT USING (true);
  `;

  console.log('Creating tables...');
  console.log(createTablesSQL);

  // Note: The rpc function might not work, so we'll use a different approach
  console.log('\nPlease run these migrations manually in the Supabase dashboard SQL editor for the test project.');
}

main().catch(console.error);