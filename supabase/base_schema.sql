-- Base Schema for Shahirizada Meat Market
-- This creates all the necessary tables that migrations depend on

-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    default_currency TEXT DEFAULT 'USD',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    name TEXT,
    tenant_id UUID REFERENCES public.tenants(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    category TEXT,
    image_url TEXT,
    available BOOLEAN DEFAULT true,
    price_unit TEXT DEFAULT 'per_item',
    dietary_tags TEXT[],
    popular BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    user_id UUID REFERENCES public.users(id),
    items JSONB NOT NULL,
    subtotal INTEGER NOT NULL,
    tax INTEGER,
    tip INTEGER,
    delivery_fee INTEGER,
    grand_total INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    fulfillment_type TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ,
    customer_info JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment_intents table
CREATE TABLE IF NOT EXISTS public.payment_intents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    order_id UUID REFERENCES public.orders(id),
    stripe_payment_intent_id TEXT,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create loyalty_accounts table
CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    user_id UUID REFERENCES public.users(id),
    points_balance INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'bronze',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- Create loyalty_transactions table
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    user_id UUID REFERENCES public.users(id),
    account_id UUID REFERENCES public.loyalty_accounts(id),
    order_id UUID REFERENCES public.orders(id),
    type TEXT NOT NULL,
    points INTEGER NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rewards table
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    name TEXT NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    reward_type TEXT NOT NULL,
    reward_value JSONB,
    available BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reward_redemptions table
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    user_id UUID REFERENCES public.users(id),
    reward_id UUID REFERENCES public.rewards(id),
    order_id UUID REFERENCES public.orders(id),
    points_spent INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    excerpt TEXT,
    author TEXT,
    image_url TEXT,
    tags TEXT[],
    published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

-- Create kv_store table
CREATE TABLE IF NOT EXISTS public.kv_store (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    key TEXT NOT NULL,
    value JSONB,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, key)
);

-- Create pickup_status table
CREATE TABLE IF NOT EXISTS public.pickup_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    order_id UUID REFERENCES public.orders(id),
    status TEXT NOT NULL,
    notification_sent BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    referrer_id UUID REFERENCES public.users(id),
    referred_id UUID REFERENCES public.users(id),
    referral_code TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    reward_given BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, referral_code)
);

-- Insert default tenant for Shahirizada
INSERT INTO public.tenants (slug, name, default_currency, config)
VALUES (
    'shahirizada',
    'Shahirizada Meat Market',
    'USD',
    '{
        "theme": {
            "primaryColor": "#6B0F1A",
            "accentColor": "#E8D5BA"
        },
        "features": {
            "loyalty": true,
            "blog": true,
            "pickup": true,
            "delivery": true
        }
    }'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kv_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (allow all for now, can be refined later)
CREATE POLICY "Enable read access for all users" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.blog_posts FOR SELECT USING (published = true);
CREATE POLICY "Enable read access for all users" ON public.rewards FOR SELECT USING (available = true);