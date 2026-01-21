-- Update test menu items to use production image URLs
-- Run this in TEST Supabase SQL editor (pbzpqsdjaiynrpjpubai)

-- Update all image URLs to point to production Supabase storage
UPDATE public.menu_items
SET
  image_url = REPLACE(
    image_url,
    'https://source.unsplash.com/800x600/?',
    'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/'
  ),
  metadata = jsonb_set(
    metadata,
    '{imageUrl}',
    to_jsonb(
      REPLACE(
        metadata->>'imageUrl',
        'https://source.unsplash.com/800x600/?',
        'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/'
      )
    )
  )
WHERE tenant_id = 'aa87f0bc-06cf-4b33-a4d8-7158b1347cae'::uuid
  AND image_url LIKE 'https://source.unsplash.com%';

-- Map specific products to their actual images
UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-ground-1761507753561.jpeg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-ground-1761507753561.jpeg"')
WHERE external_id = 'beef-ground';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-ribeye-1761507750763.jpeg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-ribeye-1761507750763.jpeg"')
WHERE external_id = 'beef-ribeye';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/lamb-chops-1761507745618.jpeg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/lamb-chops-1761507745618.jpeg"')
WHERE external_id = 'lamb-chops';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-sirloin-1761507756439.jpeg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-sirloin-1761507756439.jpeg"')
WHERE external_id = 'beef-sirloin';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/basmati-rice-1761507764206.jpeg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/basmati-rice-1761507764206.jpeg"')
WHERE external_id = 'basmati-rice';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/hummus-1761507759105.jpeg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/hummus-1761507759105.jpeg"')
WHERE external_id = 'hummus';

UPDATE public.menu_items SET
  image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/pita-bread-1761507762140.jpeg',
  metadata = jsonb_set(metadata, '{imageUrl}', '"https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/pita-bread-1761507762140.jpeg"')
WHERE external_id = 'pita-bread';

-- Clear the KV store cache to force reload
DELETE FROM public.kv_store_a05c3297 WHERE key LIKE 'menu:%';

-- Verify the updates
SELECT external_id, name, image_url
FROM public.menu_items
WHERE tenant_id = 'aa87f0bc-06cf-4b33-a4d8-7158b1347cae'::uuid
LIMIT 10;