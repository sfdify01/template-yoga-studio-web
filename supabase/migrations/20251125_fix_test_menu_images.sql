-- Fix test environment menu images to use production storage URLs
-- Production storage is public, so test can load images from it

UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-kofta-1761507973573.png' WHERE external_id = 'beef-kofta';
UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/lamb-kebab-1761508038123.jpg' WHERE external_id = 'lamb-kebab';
UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-sirloin-1761507853025.webp' WHERE external_id = 'beef-sirloin';
UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/basmati-rice-1761508070126.jpg' WHERE external_id = 'basmati-rice';
UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/olive-oil-1761509081565.jpg' WHERE external_id = 'olive-oil';
UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/halal-cheese-1761509314323.png' WHERE external_id = 'halal-cheese';
UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/honey-1761509352785.jpg' WHERE external_id = 'honey';
UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-ribeye-1761507704589.jpeg' WHERE external_id = 'beef-ribeye';
UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/beef-ground-1761507753561.jpeg' WHERE external_id = 'beef-ground';
UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/lamb-chops-1762439411494.webp' WHERE external_id = 'lamb-chops';
UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/item-1762437347484-1762437412992.avif' WHERE external_id = 'spice-mix';
UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/pita-bread-1761509143757.jpg' WHERE external_id = 'pita-bread';
UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/dates-1761509182150.webp' WHERE external_id = 'dates';
UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/hummus-1761509213950.jpg' WHERE external_id = 'hummus';
UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/item-1762437595505-1762437618139.jpg' WHERE external_id = 'saffron';
UPDATE menu_items SET image_url = 'https://cdfllxxtgguyveowmdis.supabase.co/storage/v1/object/public/make-a05c3297-product-images/turkish-delight-1761509258239.jpg' WHERE external_id = 'turkish-delight';

-- Note: kv_store cache will be cleared on next Edge Function deployment
