-- Allow authenticated users to read tenant data (needed for admin dashboard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenants'
    AND schemaname = 'public'
    AND policyname = 'Authenticated users can read tenants'
  ) THEN
    CREATE POLICY "Authenticated users can read tenants"
    ON public.tenants FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;
