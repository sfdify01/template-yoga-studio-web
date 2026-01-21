/**
 * Supabase Image Upload Utility
 *
 * This script helps you upload product images to Supabase Storage and
 * updates your menu.json file with the Supabase URLs.
 *
 * Usage:
 *   1. Place your product images in /public/images/products/
 *   2. Name them with the item ID (e.g., "beef-ribeye.jpg")
 *   3. Run: npm run upload-images
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET_NAME = 'menu-images';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

interface MenuItem {
  id: string;
  name: string;
  imageUrl?: string;
  [key: string]: any;
}

interface MenuData {
  categories: Array<{
    id: string;
    name: string;
    items: MenuItem[];
  }>;
}

async function ensureBucketExists() {
  console.log('🗂️  Checking if bucket exists...');

  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

  if (!bucketExists) {
    console.log('📦 Creating bucket...');
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    });

    if (error) {
      console.error('❌ Error creating bucket:', error);
      return false;
    }
    console.log('✅ Bucket created successfully');
  } else {
    console.log('✅ Bucket already exists');
  }

  return true;
}

async function uploadImage(filePath: string, itemId: string): Promise<string | null> {
  const fileName = `${itemId}${path.extname(filePath)}`;
  const fileBuffer = fs.readFileSync(filePath);

  console.log(`📤 Uploading ${fileName}...`);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, fileBuffer, {
      contentType: `image/${path.extname(filePath).slice(1)}`,
      upsert: true
    });

  if (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  console.log(`  ✅ Uploaded: ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

async function uploadImagesForMenu(menuPath: string, imagesDir: string) {
  console.log(`\n📝 Processing menu: ${menuPath}`);

  if (!fs.existsSync(menuPath)) {
    console.log('❌ Menu file not found');
    return;
  }

  if (!fs.existsSync(imagesDir)) {
    console.log('❌ Images directory not found');
    console.log(`   Create it at: ${imagesDir}`);
    return;
  }

  const menuContent = fs.readFileSync(menuPath, 'utf8');
  const menu: MenuData = JSON.parse(menuContent);

  let uploadedCount = 0;
  let skippedCount = 0;

  for (const category of menu.categories) {
    for (const item of category.items) {
      // Look for image file matching item ID
      const possibleExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      let imagePath: string | null = null;

      for (const ext of possibleExtensions) {
        const testPath = path.join(imagesDir, `${item.id}${ext}`);
        if (fs.existsSync(testPath)) {
          imagePath = testPath;
          break;
        }
      }

      if (!imagePath) {
        console.log(`⏭️  Skipping ${item.name} (no image file found for ID: ${item.id})`);
        skippedCount++;
        continue;
      }

      const publicUrl = await uploadImage(imagePath, item.id);

      if (publicUrl) {
        item.imageUrl = publicUrl;
        uploadedCount++;
      }
    }
  }

  // Write updated menu back to file
  fs.writeFileSync(menuPath, JSON.stringify(menu, null, 2));

  console.log(`\n✨ Done!`);
  console.log(`   Uploaded: ${uploadedCount} images`);
  console.log(`   Skipped: ${skippedCount} items (no image found)`);
}

async function main() {
  console.log('🚀 Supabase Image Upload Utility\n');

  const bucketReady = await ensureBucketExists();
  if (!bucketReady) {
    process.exit(1);
  }

  const menuPath = path.join(process.cwd(), 'public/data/sample/menu.json');
  const imagesDir = path.join(process.cwd(), 'public/images/products');

  await uploadImagesForMenu(menuPath, imagesDir);

  console.log('\n💡 Next steps:');
  console.log('   1. Check your images at: Supabase Dashboard > Storage > menu-images');
  console.log('   2. Refresh your app to see the new images');
  console.log('   3. Add more images to /public/images/products/ and run again');
}

main().catch(console.error);
