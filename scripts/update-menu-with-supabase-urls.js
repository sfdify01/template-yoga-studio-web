#!/usr/bin/env node
/**
 * Update Menu with Supabase Image URLs
 *
 * After uploading images to Supabase Storage, run this script to update
 * your menu.json with the correct Supabase URLs.
 *
 * Usage:
 *   node scripts/update-menu-with-supabase-urls.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🚀 Update Menu with Supabase Image URLs\n');

  // Get Supabase project URL
  const projectUrl = await question('Enter your Supabase Project URL (e.g., https://xxxxx.supabase.co): ');

  if (!projectUrl || !projectUrl.includes('supabase.co')) {
    console.error('❌ Invalid Supabase URL');
    rl.close();
    return;
  }

  const bucketName = 'menu-images';
  const baseUrl = `${projectUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucketName}`;

  console.log(`\n📦 Using bucket: ${bucketName}`);
  console.log(`🔗 Base URL: ${baseUrl}\n`);

  // Update menu files
  const menuFiles = [
    'public/data/sample/menu.json',
    'public/data/sample/menu-halal-market.json',
  ];

  let totalUpdated = 0;

  for (const menuFile of menuFiles) {
    const filePath = path.join(process.cwd(), menuFile);

    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipping ${menuFile} (not found)`);
      continue;
    }

    console.log(`📝 Processing: ${menuFile}`);

    const content = fs.readFileSync(filePath, 'utf8');
    const menu = JSON.parse(content);

    let updatedCount = 0;

    menu.categories.forEach(category => {
      category.items.forEach(item => {
        // Generate Supabase URL for this item
        const imageUrl = `${baseUrl}/${item.id}.jpg`;

        if (item.imageUrl !== imageUrl) {
          console.log(`  ✓ ${item.name}: ${imageUrl}`);
          item.imageUrl = imageUrl;
          updatedCount++;
        }
      });
    });

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(menu, null, 2));
    console.log(`✅ Updated ${updatedCount} images in ${menuFile}\n`);
    totalUpdated += updatedCount;
  }

  console.log(`\n✨ Done! Updated ${totalUpdated} total images.`);
  console.log('\n💡 Next steps:');
  console.log('   1. Refresh your app to see the Supabase images');
  console.log('   2. If images don\'t load, check:');
  console.log('      - Bucket is set to PUBLIC in Supabase');
  console.log('      - Image filenames match item IDs (e.g., beef-ribeye.jpg)');
  console.log('      - Images are actually uploaded to Supabase Storage');

  rl.close();
}

main().catch(err => {
  console.error('Error:', err);
  rl.close();
});
