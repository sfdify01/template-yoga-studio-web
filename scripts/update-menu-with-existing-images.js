#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const baseUrl = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images';

// Map of item IDs to actual filenames in your bucket
const imageMap = {
  'beef-ribeye': 'beef-ribeye-1761507704589.jpeg',
  'beef-ground': 'beef-ground-1761507753561.jpeg',
  'beef-sirloin': 'beef-sirloin-1761507853025.webp',
  'beef-kofta': 'beef-kofta-1761507973573.png',
  'basmati-rice': 'basmati-rice-1761508070126.jpg',
  'dates': 'dates-1761509182150.webp',
  'halal-cheese': 'halal-cheese-1761509314323.png',
  'honey': 'honey-1761509352785.jpg',
  'hummus': 'hummus-1761509213950.jpg',
  // Newly identified images from generic filenames
  'lamb-chops': 'lamb-chops-1762439411494.webp',
  'lamb-kebab': 'lamb-kebab-1761508038123.jpg',
  'olive-oil': 'olive-oil-1761509081565.jpg',
  'spice-mix': 'item-1762437347484-1762437412992.avif',
  'pita-bread': 'pita-bread-1761509143757.jpg',
  'saffron': 'item-1762437595505-1762437618139.jpg',
  'turkish-delight': 'turkish-delight-1761509258239.jpg',
};

const menuFiles = [
  'public/data/sample/menu.json',
  'public/data/sample/menu-halal-market.json',
];

let totalUpdated = 0;

menuFiles.forEach(menuFile => {
  const filePath = path.join(process.cwd(), menuFile);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skipping ${menuFile} (not found)`);
    return;
  }

  console.log(`\n📝 Processing: ${menuFile}`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const menu = JSON.parse(content);
  
  let updatedCount = 0;
  
  menu.categories.forEach(category => {
    category.items.forEach(item => {
      const filename = imageMap[item.id];
      if (filename) {
        const imageUrl = `${baseUrl}/${filename}`;
        if (item.imageUrl !== imageUrl) {
          console.log(`  ✓ ${item.name}: ${filename}`);
          item.imageUrl = imageUrl;
          updatedCount++;
        }
      }
    });
  });
  
  fs.writeFileSync(filePath, JSON.stringify(menu, null, 2));
  console.log(`✅ Updated ${updatedCount} images in ${menuFile}`);
  totalUpdated += updatedCount;
});

console.log(`\n✨ Done! Updated ${totalUpdated} total images from your existing bucket.`);
