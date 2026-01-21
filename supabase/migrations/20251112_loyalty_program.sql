-- Loyalty program tables
BEGIN;

CREATE TABLE IF NOT EXISTS loyalty_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text,
  email_normalized text,
  phone text,
  phone_normalized text,
  name text,
  stars integer NOT NULL DEFAULT 0,
  referral_code text NOT NULL,
  referred_by text,
  first_order_completed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_profiles_email_idx
  ON loyalty_profiles(tenant_id, email_normalized)
  WHERE email_normalized IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_profiles_phone_idx
  ON loyalty_profiles(tenant_id, phone_normalized)
  WHERE phone_normalized IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_profiles_referral_code_idx
  ON loyalty_profiles(referral_code);

CREATE INDEX IF NOT EXISTS loyalty_profiles_tenant_idx
  ON loyalty_profiles(tenant_id);

CREATE OR REPLACE FUNCTION loyalty_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS loyalty_profiles_updated_at ON loyalty_profiles;
CREATE TRIGGER loyalty_profiles_updated_at
BEFORE UPDATE ON loyalty_profiles
FOR EACH ROW EXECUTE FUNCTION loyalty_set_updated_at();

CREATE TABLE IF NOT EXISTS loyalty_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES loyalty_profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  type text NOT NULL,
  stars integer NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyalty_events_profile_idx
  ON loyalty_events(tenant_id, profile_id);

COMMIT;
