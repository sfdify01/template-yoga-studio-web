-- Ensure Shahirizada tenant exists
INSERT INTO public.tenants (
    id,
    slug,
    name,
    default_currency,
    ordering_enabled,
    stripe_connect_account_id,
    stripe_application_fee_bps,
    support_email,
    config
) VALUES (
    '807a5c76-c690-4f78-b721-0cf9ba763f5d'::uuid,
    'shahirizada',
    'Shahirizada Fresh Market',
    'USD',
    true,
    'acct_1SRs0KELeuKYRuTW',
    100,
    'support@shahirizadameatmarket.com',
    jsonb_build_object(
        'theme', jsonb_build_object(
            'primaryColor', '#6B0F1A',
            'accentColor', '#E8D5BA'
        ),
        'features', jsonb_build_object(
            'loyalty', true,
            'blog', true,
            'pickup', true,
            'delivery', true,
            'catering', true,
            'events', true
        ),
        'delivery', jsonb_build_object(
            'provider', 'doordash',
            'maxDistance', 8
        ),
        'social', jsonb_build_object(
            'instagram', '@akmammet',
            'facebook', 'shahirizadameatmarket'
        )
    )
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    ordering_enabled = EXCLUDED.ordering_enabled,
    stripe_connect_account_id = EXCLUDED.stripe_connect_account_id,
    stripe_application_fee_bps = EXCLUDED.stripe_application_fee_bps,
    support_email = EXCLUDED.support_email,
    config = EXCLUDED.config;