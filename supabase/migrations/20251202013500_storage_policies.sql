-- Storage policies for product images bucket
-- Allow anyone to read (public bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Public read access for product images'
  ) THEN
    CREATE POLICY "Public read access for product images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'make-a05c3297-product-images');
  END IF;
END $$;

-- Allow admin users to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Admin users can upload product images'
  ) THEN
    CREATE POLICY "Admin users can upload product images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'make-a05c3297-product-images' AND public.is_admin());
  END IF;
END $$;

-- Allow admin users to update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Admin users can update product images'
  ) THEN
    CREATE POLICY "Admin users can update product images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'make-a05c3297-product-images' AND public.is_admin());
  END IF;
END $$;

-- Allow admin users to delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Admin users can delete product images'
  ) THEN
    CREATE POLICY "Admin users can delete product images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'make-a05c3297-product-images' AND public.is_admin());
  END IF;
END $$;
