-- Add delivery_id column to courier_tasks if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'courier_tasks'
      AND column_name = 'delivery_id'
  ) THEN
    ALTER TABLE public.courier_tasks
      ADD COLUMN delivery_id TEXT;
  END IF;
END $$;

-- Seed pickup configuration for primary tenant
UPDATE public.tenants
SET config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
  'pickup', jsonb_build_object(
    'name', 'Shahirizada Fresh Market',
    'phone', '+16305551234',
    'address', jsonb_build_object(
      'line1', '3124 Illinois Rte 59 #158',
      'line2', null,
      'city', 'Naperville',
      'state', 'IL',
      'zip', '60564',
      'country', 'US'
    ),
    'coordinates', jsonb_build_object('lat', 41.7508, 'lng', -88.1535)
  )
)
WHERE slug = 'shahirizada';
