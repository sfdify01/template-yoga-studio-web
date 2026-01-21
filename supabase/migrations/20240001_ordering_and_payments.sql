-- ============================================================================
-- Core ordering + Stripe Connect payments schema
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create or replace function public.is_service_role() returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role' = 'service_role', false);
$$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  name text not null,
  config jsonb not null default '{}'::jsonb,
  default_currency text not null default 'USD',
  ordering_enabled boolean not null default true,
  stripe_connect_account_id text,
  stripe_application_fee_bps integer not null default 0,
  support_email text,
  support_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.tenants (slug, name, default_currency, ordering_enabled, stripe_connect_account_id, stripe_application_fee_bps, support_email)
values (
  'shahirizada',
  'Shahirizada Fresh Market',
  'USD',
  true,
  'acct_1SRs0KELeuKYRuTW',
  100,
  'support@tabsy.dev'
)
on conflict (slug) do update set
  name = excluded.name,
  ordering_enabled = excluded.ordering_enabled,
  stripe_connect_account_id = excluded.stripe_connect_account_id,
  stripe_application_fee_bps = excluded.stripe_application_fee_bps;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  first_name text,
  last_name text,
  email citext,
  phone text,
  loyalty_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_tenant_email_unique
  on public.customers(tenant_id, email)
  where email is not null;
create unique index if not exists customers_tenant_phone_unique
  on public.customers(tenant_id, phone)
  where phone is not null;
create index if not exists customers_auth_user_id_idx
  on public.customers(auth_user_id)
  where auth_user_id is not null;

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  street_line1 text not null,
  street_line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  delivery_instructions text,
  latitude double precision,
  longitude double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists addresses_customer_idx on public.addresses(customer_id);
create index if not exists addresses_tenant_idx on public.addresses(tenant_id);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  external_id text,
  name text not null,
  description text,
  category text,
  image_url text,
  price_cents integer not null,
  price_unit text not null default 'each',
  dietary_tags text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, external_id)
);

create index if not exists menu_items_tenant_idx on public.menu_items(tenant_id, is_active);

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  stripe_payment_intent_id text not null unique,
  status text not null,
  amount_cents integer not null,
  currency text not null default 'USD',
  application_fee_amount_cents integer not null default 0,
  transfer_destination text,
  customer_email text,
  customer_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_intents_tenant_idx on public.payment_intents(tenant_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  delivery_address_id uuid references public.addresses(id) on delete set null,
  payment_intent_id uuid references public.payment_intents(id) on delete set null,
  order_number bigserial unique,
  fulfillment_type text not null check (fulfillment_type in ('pickup','delivery')),
  status text not null check (status in ('created','accepted','in_kitchen','ready','courier_requested','driver_en_route','picked_up','delivered','rejected','canceled','failed')),
  payment_status text not null check (payment_status in ('unpaid','processing','paid','refunded','failed')),
  source text not null default 'web',
  scheduled_for timestamptz,
  currency text not null default 'USD',
  subtotal_cents integer not null,
  tax_cents integer not null,
  tip_cents integer not null default 0,
  delivery_fee_cents integer not null default 0,
  service_fee_cents integer not null default 0,
  discount_cents integer not null default 0,
  total_cents integer not null,
  items_count integer not null default 0,
  contact_name text,
  contact_email text,
  contact_phone text,
  special_instructions text,
  pickup_eta timestamptz,
  delivery_eta timestamptz,
  pos_order_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_totals_nonnegative check (
    subtotal_cents >= 0 and tax_cents >= 0 and tip_cents >= 0 and delivery_fee_cents >= 0 and service_fee_cents >= 0
  ),
  constraint orders_total_math check (
    total_cents = subtotal_cents + tax_cents + tip_cents + delivery_fee_cents + service_fee_cents - discount_cents
  )
);

create index if not exists orders_tenant_created_at_idx on public.orders(tenant_id, created_at desc);
create index if not exists orders_customer_idx on public.orders(tenant_id, customer_id);
create index if not exists orders_status_idx on public.orders(tenant_id, status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  menu_item_key text,
  name text not null,
  description text,
  image_url text,
  unit_price_cents integer not null,
  quantity numeric(12,3) not null default 1,
  unit_label text,
  total_price_cents integer not null,
  modifiers jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.order_events (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  status text,
  title text not null,
  detail text,
  actor text not null default 'system',
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_idx on public.order_events(order_id, created_at);

create table if not exists public.courier_tasks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null,
  status text not null default 'not_requested',
  quote_id text,
  currency text not null default 'USD',
  fee_cents integer,
  quote_payload jsonb,
  dispatch_payload jsonb,
  tracking_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists courier_tasks_order_idx on public.courier_tasks(order_id);
create index if not exists courier_tasks_status_idx on public.courier_tasks(tenant_id, status);

alter table public.tenants enable row level security;
alter table public.customers enable row level security;
alter table public.addresses enable row level security;
alter table public.menu_items enable row level security;
alter table public.payment_intents enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.courier_tasks enable row level security;

create policy "service role tenants" on public.tenants for all using (public.is_service_role());
create policy "service role customers" on public.customers for all using (public.is_service_role());
create policy "service role addresses" on public.addresses for all using (public.is_service_role());
create policy "service role menu" on public.menu_items for all using (public.is_service_role());
create policy "service role payment intents" on public.payment_intents for all using (public.is_service_role());
create policy "service role orders" on public.orders for all using (public.is_service_role());
create policy "service role order items" on public.order_items for all using (public.is_service_role());
create policy "service role order events" on public.order_events for all using (public.is_service_role());
create policy "service role courier tasks" on public.courier_tasks for all using (public.is_service_role());

-- Allow anonymous reads for menu so the storefront can load without service credentials
create policy "public menu read" on public.menu_items
  for select
  to public
  using (is_active = true);
