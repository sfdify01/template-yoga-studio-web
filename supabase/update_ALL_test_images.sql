-- Update ALL test menu items to use production image URLs
-- Run this in TEST Supabase SQL editor (pbzpqsdjaiynrpjpubai)

-- Update ALL 16 products with their actual production images
UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-ground-1761507753561.jpeg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-ground-1761507753561.jpeg"')
WHERE external_id = 'beef-ground';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/lamb-chops-1762439411494.webp',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/lamb-chops-1762439411494.webp"')
WHERE external_id = 'lamb-chops';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-ribeye-1761507704589.jpeg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-ribeye-1761507704589.jpeg"')
WHERE external_id = 'beef-ribeye';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-sirloin-1761507853025.webp',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-sirloin-1761507853025.webp"')
WHERE external_id = 'beef-sirloin';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/basmati-rice-1761508070126.jpg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/basmati-rice-1761508070126.jpg"')
WHERE external_id = 'basmati-rice';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/olive-oil-1761509081565.jpg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/olive-oil-1761509081565.jpg"')
WHERE external_id = 'olive-oil';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/hummus-1761509213950.jpg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/hummus-1761509213950.jpg"')
WHERE external_id = 'hummus';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/pita-bread-1761509143757.jpg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/pita-bread-1761509143757.jpg"')
WHERE external_id = 'pita-bread';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/dates-1761509182150.webp',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/dates-1761509182150.webp"')
WHERE external_id = 'dates';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/item-1762437347484-1762437412992.avif',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/item-1762437347484-1762437412992.avif"')
WHERE external_id = 'spice-mix';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-kofta-1761507973573.png',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-kofta-1761507973573.png"')
WHERE external_id = 'beef-kofta';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/lamb-kebab-1761508038123.jpg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/lamb-kebab-1761508038123.jpg"')
WHERE external_id = 'lamb-kebab';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/halal-cheese-1761509314323.png',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/halal-cheese-1761509314323.png"')
WHERE external_id = 'halal-cheese';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/item-1762437595505-1762437618139.jpg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/item-1762437595505-1762437618139.jpg"')
WHERE external_id = 'saffron';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/turkish-delight-1761509258239.jpg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/turkish-delight-1761509258239.jpg"')
WHERE external_id = 'turkish-delight';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/honey-1761509352785.jpg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/honey-1761509352785.jpg"')
WHERE external_id = 'honey';

-- Clear the KV store cache to force reload
DELETE FROM public.kv_store_a05c3297 WHERE key LIKE 'menu:%';

-- Verify all 16 products have been updated
SELECT
  external_id,
  name,
  CASE
    WHEN image_url LIKE '%supabase.co/storage%' THEN '✅ Production Image'
    ELSE '❌ Still Placeholder'
  END as image_status
FROM public.menu_items
WHERE tenant_id = 'aa87f0bc-06cf-4b33-a4d8-7158b1347cae'::uuid
ORDER BY external_id;