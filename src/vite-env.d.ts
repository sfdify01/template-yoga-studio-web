/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_STRIPE_SECRET_KEY: string;
  readonly VITE_STRIPE_CONNECT_ACCOUNT_ID: string;
  readonly VITE_UBER_CUSTOMER_ID: string;
  readonly VITE_UBER_CLIENT_ID: string;
  readonly VITE_UBER_CLIENT_SECRET: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_INSTAGRAM_ACCESS_TOKEN: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_ENV: string;
  readonly VITE_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
