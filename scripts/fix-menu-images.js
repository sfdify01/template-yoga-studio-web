#!/usr/bin/env node
/**
 * Fix Menu Images Script
 *
 * This script updates all menu.json files to use LoremFlickr instead of
 * the deprecated Unsplash Source API.
 */

const fs = require('fs');
const path = require('path');

function generateLoremFlickrUrl(query, width = 800, height = 600) {
  const cleanQuery = query.replace(/\s+/g, ',');
  return `https://loremflickr.com/${width}/${height}/${cleanQuery}`;
}

function updateMenuImages(filePath) {
  console.log(`\n📝 Processing: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const menu = JSON.parse(content);

  let updatedCount = 0;

  // Handle different menu structures
  if (menu.categories) {
    // Standard menu structure
    menu.categories.forEach(category => {
      category.items.forEach(item => {
        const query = item.image
          ? item.image
          : item.name.toLowerCase().replace(/[^a-z0-9\s]/g, '');

        const newUrl = generateLoremFlickrUrl(query);

        if (item.imageUrl !== newUrl) {
          console.log(`  ✓ ${item.name}: ${newUrl}`);
          item.imageUrl = newUrl;
          updatedCount++;
        }
      });
    });
  } else if (Array.isArray(menu)) {
    // Array of items
    menu.forEach(item => {
      if (item.name) {
        const query = item.image
          ? item.image
          : item.name.toLowerCase().replace(/[^a-z0-9\s]/g, '');

        const newUrl = generateLoremFlickrUrl(query);

        if (item.imageUrl !== newUrl) {
          console.log(`  ✓ ${item.name}: ${newUrl}`);
          item.imageUrl = newUrl;
          updatedCount++;
        }
      }
    });
  } else {
    console.log(`⚠️  Unknown menu structure in ${filePath}`);
    return;
  }

  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(menu, null, 2));
  console.log(`✅ Updated ${updatedCount} images in ${filePath}`);
}

// Update all menu files
const menuFiles = [
  'public/data/sample/menu.json',
  'public/data/sample/menu-halal-market.json',
  'public/data/sample/universal-menu-items.json',
];

console.log('🔧 Fixing Menu Images...\n');
console.log('Converting from deprecated Unsplash Source to LoremFlickr\n');

menuFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  updateMenuImages(fullPath);
});

console.log('\n✨ Done! All menu images have been updated.');
console.log('\n💡 Note: LoremFlickr provides placeholder images from Flickr.');
console.log('   For best results, upload your own product photos to Supabase.');
