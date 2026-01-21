const { createClient } = require('@supabase/supabase-js');

// Production Supabase
const prodUrl = 'https://cdfllxxtgguyveowmdis.supabase.co';
const prodKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXX.XXXX';

// Test Supabase
const testUrl = 'https://pbzpqsdjaiynrpjpubai.supabase.co';
const testKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXX.XXXX';

const prodSupabase = createClient(prodUrl, prodKey);
const testSupabase = createClient(testUrl, testKey);

async function copyTable(tableName, clearFirst = true) {
  try {
    console.log(`\nCopying ${tableName}...`);

    // Fetch data from production
    const { data: prodData, error: fetchError } = await prodSupabase
      .from(tableName)
      .select('*');

    if (fetchError) {
      console.error(`Error fetching from ${tableName}:`, fetchError);
      return;
    }

    if (!prodData || prodData.length === 0) {
      console.log(`No data found in ${tableName}`);
      return;
    }

    console.log(`Found ${prodData.length} records in ${tableName}`);

    // Clear test data if requested
    if (clearFirst) {
      const { error: deleteError } = await testSupabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError && !deleteError.message.includes('0 rows')) {
        console.error(`Error clearing ${tableName}:`, deleteError);
      }
    }

    // Insert data into test
    const { error: insertError } = await testSupabase
      .from(tableName)
      .upsert(prodData, { onConflict: 'id' });

    if (insertError) {
      console.error(`Error inserting into ${tableName}:`, insertError);
      return;
    }

    console.log(`✓ Successfully copied ${prodData.length} records to ${tableName}`);
  } catch (error) {
    console.error(`Unexpected error with ${tableName}:`, error);
  }
}

async function main() {
  console.log('Starting data copy from production to test...');

  // Copy tables in order (considering foreign key dependencies)
  const tables = [
    'tenants',
    'menu_categories',
    'menu_items',
    'menu_modifiers',
    'menu_modifier_options',
    'menu_item_modifiers',
    'blog_posts',
    'delivery_zones',
    'store_settings',
    'reward_tiers',
    'available_rewards'
  ];

  for (const table of tables) {
    await copyTable(table, true);
  }

  console.log('\n✅ Data copy completed!');
}

main().catch(console.error);