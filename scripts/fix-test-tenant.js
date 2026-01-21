const { createClient } = require('@supabase/supabase-js');

// Test Supabase
const testUrl = 'https://pbzpqsdjaiynrpjpubai.supabase.co';
const testKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXX.XXXX';

const testSupabase = createClient(testUrl, testKey);

async function fixTenant() {
  console.log('Creating/updating tenant for test environment...');

  // Create the tenant with the ID that menu items are using
  const tenantData = {
    id: 'aa87f0bc-06cf-4b33-a4d8-7158b1347cae',
    slug: 'shahirizada',
    name: 'Shahirizada Fresh Market',
    default_currency: 'USD',
    ordering_enabled: true,
    stripe_connect_account_id: 'acct_1SRs0KELeuKYRuTW',
    stripe_application_fee_bps: 100,
    support_email: 'support@shahirizadameatmarket.com',
    config: {
      theme: {
        primaryColor: '#6B0F1A',
        accentColor: '#E8D5BA'
      },
      features: {
        loyalty: true,
        blog: true,
        pickup: true,
        delivery: true,
        catering: true,
        events: true
      },
      delivery: {
        provider: 'doordash',
        maxDistance: 8
      },
      social: {
        instagram: '@akmammet',
        facebook: 'shahirizadameatmarket'
      }
    }
  };

  const { data, error } = await testSupabase
    .from('tenants')
    .upsert(tenantData, { onConflict: 'id' });

  if (error) {
    console.error('Error creating/updating tenant:', error);
    return;
  }

  console.log('✓ Tenant created/updated successfully');

  // Verify the tenant exists
  const { data: verifyData, error: verifyError } = await testSupabase
    .from('tenants')
    .select('*')
    .eq('slug', 'shahirizada')
    .single();

  if (verifyError) {
    console.error('Error verifying tenant:', verifyError);
  } else {
    console.log('✓ Verified tenant exists:', verifyData.name);
  }

  // Check menu items count
  const { count, error: countError } = await testSupabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', 'aa87f0bc-06cf-4b33-a4d8-7158b1347cae');

  if (!countError) {
    console.log(`✓ Found ${count} menu items for this tenant`);
  }
}

fixTenant().catch(console.error);