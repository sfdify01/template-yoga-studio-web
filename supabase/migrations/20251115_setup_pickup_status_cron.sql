-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create a function to call the pickup-status-updater Edge Function
CREATE OR REPLACE FUNCTION public.trigger_pickup_status_update()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url text;
  anon_key text;
BEGIN
  -- Get project URL and anon key from environment
  -- These will be set by Supabase
  project_url := current_setting('app.settings.supabase_url', true);
  anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- If settings not found, use hardcoded values (update these with your values)
  IF project_url IS NULL THEN
    project_url := 'https://cdfllxxtgguyveowmdis.supabase.co';
  END IF;

  -- Make HTTP POST request to the Edge Function
  PERFORM net.http_post(
    url := project_url || '/functions/v1/pickup-status-updater',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(anon_key, '')
    ),
    body := '{}'::jsonb
  );

  -- Log the execution
  RAISE NOTICE 'Pickup status updater triggered at %', now();
END;
$$;

-- Schedule the function to run every minute
-- Remove any existing schedule first
SELECT cron.unschedule('pickup-status-updater') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'pickup-status-updater'
);

-- Create the cron job
SELECT cron.schedule(
  'pickup-status-updater',
  '* * * * *', -- Every minute
  $$SELECT public.trigger_pickup_status_update();$$
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'pickup-status-updater';
