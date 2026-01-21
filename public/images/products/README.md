# Product Images Directory

This directory is for your product images that will be uploaded to Supabase Storage.

## Quick Start

### Option 1: Use Placeholder Images (Current)

Your menu is currently using **LoremFlickr** placeholder images. These work immediately but are generic stock photos from Flickr.

✅ **No setup required** - images load automatically
⚠️ **Downside** - Not your actual products, may not match exactly

### Option 2: Upload Your Own Images (Recommended)

For the best customer experience, upload your own product photos to Supabase.

## How to Upload Your Own Images

### Step 1: Prepare Your Images

1. Take high-quality photos of your products
2. Recommended size: **800x600 pixels** or larger
3. Format: JPG, PNG, or WebP
4. Name them with the **item ID** from your menu.json

Example:
```
beef-ribeye.jpg          → matches item ID "beef-ribeye"
lamb-chops.jpg           → matches item ID "lamb-chops"
```

### Step 2: Add Images to This Directory

Copy your images into this folder:
```
/public/images/products/beef-ribeye.jpg
/public/images/products/lamb-chops.jpg
/public/images/products/lamb-kebab.jpg
```

### Step 3: Set Up Supabase Credentials

Create a `.env` file in the project root with:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

You can find these in your Supabase Dashboard:
- Go to Project Settings > API
- Copy the **Project URL** and **Service Role Key**

### Step 4: Upload to Supabase

Run the upload script:

```bash
npm run upload-images
```

This will:
✅ Create a `menu-images` bucket in Supabase Storage (if needed)
✅ Upload all images from this directory
✅ Update your menu.json with the Supabase URLs
✅ Make images publicly accessible

### Step 5: Refresh Your App

After uploading, refresh your app to see your real product images!

## Finding Item IDs

Your item IDs are in `/public/data/sample/menu.json`. Example:

```json
{
  "id": "beef-ribeye",         ← This is the item ID
  "name": "Ribeye Steak",
  "description": "...",
  "imageUrl": "..."
}
```

## Image Guidelines

### Best Practices

✅ **High quality** - At least 800x600px
✅ **Well-lit** - Natural lighting works best
✅ **Centered** - Product should be the focus
✅ **Clean background** - Simple, uncluttered
✅ **Consistent style** - Similar angles and lighting

### File Size

- Target: **100-300 KB per image**
- Maximum: **5 MB** (Supabase limit)
- Use image compression tools if needed

## Current Menu Items

Here are all your menu items that need images:

**Fresh Halal Meats:**
- beef-ribeye.jpg
- beef-ground.jpg
- lamb-chops.jpg
- beef-sirloin.jpg

**Prepared Foods:**
- beef-kofta.jpg
- lamb-kebab.jpg

**Groceries & Staples:**
- basmati-rice.jpg
- olive-oil.jpg
- spice-mix.jpg
- pita-bread.jpg
- medjool-dates.jpg
- fresh-hummus.jpg
- premium-saffron.jpg
- turkish-delight.jpg
- halal-cheese.jpg
- honey.jpg

## Troubleshooting

### Images Not Uploading?

Check:
- ✓ Images are named with correct item IDs
- ✓ File format is JPG, PNG, or WebP
- ✓ Supabase credentials are correct in .env
- ✓ You have internet connection

### Can't Find Item ID?

Open `/public/data/sample/menu.json` and search for your product name. The `"id"` field is what you need.

## Need Help?

1. Check the Supabase Dashboard > Storage to see uploaded images
2. Run `npm run fix-images` to reset to placeholder images
3. Contact support if issues persist

---

**Pro Tip:** Take all your product photos at once with consistent lighting and background for a professional look!
