-- Admin role full access policies
-- Admins should bypass RLS on all tables for CRUD operations

-- Create or replace is_admin function to check JWT claims
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    -- Check app_metadata.roles array
    (auth.jwt() -> 'app_metadata' -> 'roles') ? 'admin',
    -- Fallback: check app_metadata.role string
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Admin full access on tenants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenants'
    AND schemaname = 'public'
    AND policyname = 'Admin full access on tenants'
  ) THEN
    CREATE POLICY "Admin full access on tenants"
    ON public.tenants FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Admin full access on menu_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'menu_items'
    AND schemaname = 'public'
    AND policyname = 'Admin full access on menu_items'
  ) THEN
    CREATE POLICY "Admin full access on menu_items"
    ON public.menu_items FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Admin full access on customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'customers'
    AND schemaname = 'public'
    AND policyname = 'Admin full access on customers'
  ) THEN
    CREATE POLICY "Admin full access on customers"
    ON public.customers FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Admin full access on orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders'
    AND schemaname = 'public'
    AND policyname = 'Admin full access on orders'
  ) THEN
    CREATE POLICY "Admin full access on orders"
    ON public.orders FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Admin full access on order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'order_items'
    AND schemaname = 'public'
    AND policyname = 'Admin full access on order_items'
  ) THEN
    CREATE POLICY "Admin full access on order_items"
    ON public.order_items FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Admin full access on order_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'order_events'
    AND schemaname = 'public'
    AND policyname = 'Admin full access on order_events'
  ) THEN
    CREATE POLICY "Admin full access on order_events"
    ON public.order_events FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Admin full access on addresses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'addresses'
    AND schemaname = 'public'
    AND policyname = 'Admin full access on addresses'
  ) THEN
    CREATE POLICY "Admin full access on addresses"
    ON public.addresses FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Admin full access on payment_intents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payment_intents'
    AND schemaname = 'public'
    AND policyname = 'Admin full access on payment_intents'
  ) THEN
    CREATE POLICY "Admin full access on payment_intents"
    ON public.payment_intents FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Admin full access on courier_tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'courier_tasks'
    AND schemaname = 'public'
    AND policyname = 'Admin full access on courier_tasks'
  ) THEN
    CREATE POLICY "Admin full access on courier_tasks"
    ON public.courier_tasks FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Drop the simpler authenticated read policy on tenants (we now have admin full access)
DROP POLICY IF EXISTS "Authenticated users can read tenants" ON public.tenants;
