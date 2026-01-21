-- Seed menu_items from supabase/seed/menu.json
BEGIN;

DELETE FROM menu_items WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'shahirizada');

WITH payload AS (
  SELECT $${"categories":[{"id":"fresh-meats","name":"Fresh Halal Meats","description":"Premium quality, hand-cut daily","icon":"🥩","items":[{"id":"beef-ribeye","name":"Ribeye Steak","description":"USDA Choice, grass-fed, premium marbling - 1 lb","price":18.99,"image":"ribeye steak beef","imageUrl":"https://source.unsplash.com/800x600/?ribeye+steak","dietary":["halal"],"popular":true},{"id":"beef-ground","name":"Ground Beef","description":"85% lean, freshly ground - 1 lb","price":8.99,"image":"ground beef fresh","imageUrl":"https://source.unsplash.com/800x600/?ground+beef","dietary":["halal"],"popular":true},{"id":"lamb-chops","name":"Lamb Chops","description":"Premium cut, bone-in - 1 lb","price":22.99,"image":"lamb chops meat","imageUrl":"https://source.unsplash.com/800x600/?lamb+chops","dietary":["halal"],"popular":true},{"id":"beef-sirloin","name":"Top Sirloin","description":"Premium cut, trimmed - 1 lb","price":14.99,"image":"sirloin steak beef","imageUrl":"https://source.unsplash.com/800x600/?sirloin+steak","dietary":["halal"]}]},{"id":"prepared-foods","name":"Prepared Foods","description":"Ready to heat and eat","icon":"🍱","items":[{"id":"beef-kofta","name":"Beef Kofta","description":"Spiced ground beef, formed - 8 pieces","price":14.99,"image":"beef kofta kabob","imageUrl":"https://source.unsplash.com/800x600/?kofta+kabob","dietary":["halal"]},{"id":"lamb-kebab","name":"Lamb Kebabs","description":"Tender lamb cubes, seasoned - 6 pieces","price":19.99,"image":"lamb kebab skewers","imageUrl":"https://source.unsplash.com/800x600/?lamb+kebab","dietary":["halal"],"popular":true}]},{"id":"groceries","name":"Groceries & Staples","description":"Halal-certified products","icon":"🛒","items":[{"id":"basmati-rice","name":"Basmati Rice","description":"Premium long-grain - 10 lbs","price":19.99,"image":"basmati rice bag","imageUrl":"https://source.unsplash.com/800x600/?basmati+rice","dietary":["halal","vegan"]},{"id":"olive-oil","name":"Extra Virgin Olive Oil","description":"Cold-pressed, imported - 1 liter","price":16.99,"image":"olive oil bottle","imageUrl":"https://source.unsplash.com/800x600/?olive+oil","dietary":["halal","vegan"]},{"id":"spice-mix","name":"Middle Eastern Spice Mix","description":"Authentic blend - 8 oz","price":8.99,"image":"spices middle eastern","imageUrl":"https://source.unsplash.com/800x600/?middle+eastern+spices","dietary":["halal","vegan"]},{"id":"pita-bread","name":"Fresh Pita Bread","description":"Handmade daily - 10 pack","price":5.99,"image":"pita bread fresh","imageUrl":"https://source.unsplash.com/800x600/?pita+bread","dietary":["halal","vegetarian"]},{"id":"dates","name":"Medjool Dates","description":"Premium, pitted - 1 lb","price":12.99,"image":"medjool dates","imageUrl":"https://source.unsplash.com/800x600/?medjool+dates","dietary":["halal","vegan"]},{"id":"hummus","name":"Fresh Hummus","description":"House-made, traditional - 16 oz","price":7.99,"image":"hummus bowl fresh","imageUrl":"https://source.unsplash.com/800x600/?hummus","dietary":["halal","vegan"]}]},{"id":"specialty","name":"Specialty Items","description":"Imported delicacies","icon":"⭐","items":[{"id":"saffron","name":"Premium Saffron","description":"Persian, grade A - 5 grams","price":29.99,"image":"saffron threads spice","imageUrl":"https://source.unsplash.com/800x600/?saffron","dietary":["halal","vegan"]},{"id":"turkish-delight","name":"Turkish Delight","description":"Assorted flavors - 1 lb box","price":15.99,"image":"turkish delight candy","imageUrl":"https://source.unsplash.com/800x600/?turkish+delight","dietary":["halal"]},{"id":"halal-cheese","name":"Halal Cheese Assortment","description":"Mixed varieties - 1 lb","price":13.99,"image":"cheese platter assorted","imageUrl":"https://source.unsplash.com/800x600/?cheese+platter","dietary":["halal","vegetarian"]},{"id":"honey","name":"Wild Flower Honey","description":"Raw, unfiltered - 16 oz","price":14.99,"image":"honey jar natural","imageUrl":"https://source.unsplash.com/800x600/?honey+jar","dietary":["halal","vegetarian"]}]}]}$$::jsonb AS doc
), categories AS (
  SELECT
    cat,
    cat->>'id' AS category_id,
    cat->>'name' AS category_name,
    COALESCE(cat->>'description', '') AS category_description,
    COALESCE(cat->>'icon', '🍽️') AS category_icon
  FROM payload, LATERAL jsonb_array_elements(doc->'categories') AS cat
), items AS (
  SELECT
    categories.category_id,
    categories.category_name,
    categories.category_description,
    categories.category_icon,
    item,
    item->>'id' AS item_id,
    item->>'name' AS item_name,
    COALESCE(item->>'description', '') AS item_description,
    COALESCE(item->>'image', '') AS image_query,
    COALESCE(item->>'imageUrl', '') AS item_image_url,
    COALESCE((item->>'price')::numeric, 0) AS item_price,
    NULLIF(COALESCE(item->>'unit', item->>'unitLabel'), '') AS item_unit,
    NULLIF(COALESCE(item->>'unitLabel', item->>'unit'), '') AS item_unit_label,
    COALESCE((item->>'popular')::boolean, false) AS is_popular,
    COALESCE(item->'dietary', '[]'::jsonb) AS dietary_json,
    NULLIF(item->>'originalPrice', '') AS original_price_text,
    NULLIF(item->>'discountedPrice', '') AS discounted_price_text
  FROM categories
  CROSS JOIN LATERAL jsonb_array_elements(categories.cat->'items') AS item
)
INSERT INTO menu_items (
  tenant_id,
  external_id,
  name,
  category,
  description,
  image_url,
  price_cents,
  price_unit,
  dietary_tags,
  is_active,
  metadata
)
SELECT
  (SELECT id FROM tenants WHERE slug = 'shahirizada') AS tenant_id,
  item_id,
  item_name,
  category_name,
  item_description,
  NULLIF(item_image_url, '') AS image_url,
  ROUND(item_price * 100)::int AS price_cents,
  COALESCE(item_unit, 'each') AS price_unit,
  COALESCE(
    (SELECT array_agg(LOWER(value)) FROM jsonb_array_elements_text(dietary_json) AS value),
    '{}'::text[]
  ) AS dietary_tags,
  TRUE AS is_active,
  jsonb_strip_nulls(jsonb_build_object(
    'categoryId', category_id,
    'categoryName', category_name,
    'categoryDescription', category_description,
    'categoryIcon', category_icon,
    'imageQuery', NULLIF(image_query, ''),
    'popular', is_popular,
    'unit', item_unit,
    'unitLabel', item_unit_label,
    'originalPrice', CASE WHEN original_price_text IS NULL THEN NULL ELSE original_price_text::numeric END,
    'discountedPrice', CASE WHEN discounted_price_text IS NULL THEN NULL ELSE discounted_price_text::numeric END,
    'imageUrl', NULLIF(item_image_url, '')
  )) AS metadata
FROM items;

COMMIT;
