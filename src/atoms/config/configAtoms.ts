import { atom } from 'jotai';
import { edgeFunctionUrl } from '../../lib/supabase-edge';
import { publicAnonKey } from '../../utils/supabase/info';

// ============================================================================
// CONFIG TYPES
// ============================================================================

export interface PricingConfig {
  tax_rate: number;
  service_fee_rate: number;
  currency: string;
  delivery_fees: {
    zone_1_miles: number;
    zone_1_fee: number;
    zone_2_miles: number;
    zone_2_fee: number;
    zone_3_miles: number;
    zone_3_fee: number;
  };
}

export interface StripeConfig {
  publishableKey: string;
  connectAccountId?: string;
  applicationFeePercent?: number;
}

export interface TenantConfig {
  name: string;
  tagline: string;
  logo: string;
  theme: {
    brand: string;
    accent: string;
    bg: string;
    text: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  address: {
    line1: string;
    city: string;
    state: string;
    zip: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  integrations: {
    pos: string;
    ordering: {
      enabled: boolean;
      mode: string;
    };
    pickup: {
      enabled: boolean;
    };
    delivery: {
      enabled: boolean;
      provider: string;
      max_distance_miles: number;
    };
  };
  pricing: PricingConfig;
  stripe?: StripeConfig;
  loyalty: {
    enabled: boolean;
    earnPerDollar: number;
    rewardThreshold: number;
    loyaltyHref: string;
  };
}

// ============================================================================
// STATE ATOMS
// ============================================================================

/**
 * Primary configuration atom loaded from config.json
 * This is the source of truth for all tenant settings
 */
export const tenantConfigAtom = atom<TenantConfig | null>(null);

/**
 * Loading state for configuration
 */
export const configLoadingAtom = atom<boolean>(false);

/**
 * Error state for configuration loading
 */
export const configErrorAtom = atom<string | null>(null);

// ============================================================================
// DERIVED ATOMS (Read-only computed values)
// ============================================================================

/**
 * Pricing configuration derived from tenant config
 */
export const pricingConfigAtom = atom<PricingConfig | null>((get) => {
  const config = get(tenantConfigAtom);
  return config?.pricing || null;
});

/**
 * Tax rate for calculations
 * Defaults to 8.75% if not configured
 */
export const taxRateAtom = atom<number>((get) => {
  const pricing = get(pricingConfigAtom);
  return pricing?.tax_rate ?? 0.0875;
});

/**
 * Service fee rate for calculations
 * Defaults to 0% if not configured
 */
export const serviceFeeRateAtom = atom<number>((get) => {
  const pricing = get(pricingConfigAtom);
  return pricing?.service_fee_rate ?? 0.0;
});

/**
 * Currency for the tenant
 */
export const currencyAtom = atom<string>((get) => {
  const pricing = get(pricingConfigAtom);
  return pricing?.currency ?? 'USD';
});

/**
 * Stripe configuration
 */
export const stripeConfigAtom = atom<StripeConfig | null>((get) => {
  const config = get(tenantConfigAtom);
  return config?.stripe || null;
});

/**
 * Publishable key for Stripe
 */
export const stripePublishableKeyAtom = atom<string | null>((get) => {
  const stripe = get(stripeConfigAtom);
  return stripe?.publishableKey ?? null;
});

/**
 * Google Maps API key for address autocomplete
 * Can be configured in the config.json under integrations.googleMaps.apiKey
 */
export const googleMapsApiKeyAtom = atom<string | undefined>((get) => {
  const config = get(tenantConfigAtom);
  // @ts-ignore - googleMaps might not exist in type yet
  return config?.integrations?.googleMaps?.apiKey || undefined;
});

/**
 * Delivery fee calculation based on distance
 */
export const calculateDeliveryFeeAtom = atom<(distance: number) => number>(
  (get) => {
    const pricing = get(pricingConfigAtom);

    return (distance: number): number => {
      if (!pricing) return 0;

      const { delivery_fees } = pricing;

      if (distance <= delivery_fees.zone_1_miles) {
        return delivery_fees.zone_1_fee;
      }
      if (distance <= delivery_fees.zone_2_miles) {
        return delivery_fees.zone_2_fee;
      }
      if (distance <= delivery_fees.zone_3_miles) {
        return delivery_fees.zone_3_fee;
      }

      return 0; // Out of delivery range
    };
  }
);

// ============================================================================
// WRITE ATOMS (Actions)
// ============================================================================

/**
 * Load configuration from config.json AND Supabase Edge Function
 */
export const loadConfigAtom = atom(
  null,
  async (get, set) => {
    set(configLoadingAtom, true);
    set(configErrorAtom, null);

    try {
      // Load config from default location
      const response = await fetch('/data/sample/config.json');

      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`);
      }

      const config: TenantConfig = await response.json();

      // Validate required fields
      if (!config.name || !config.pricing) {
        throw new Error('Invalid config: missing required fields');
      }

      // Fetch Stripe config from Supabase Edge Function
      try {
        const edgeFunctionResponse = await fetch(edgeFunctionUrl('/config'), {
          headers: {
            apikey: publicAnonKey,
          },
        });

        if (edgeFunctionResponse.ok) {
          const edgeConfig = await edgeFunctionResponse.json();

          // Merge Stripe config from Edge Function (takes priority)
          if (edgeConfig.stripe?.publishableKey) {
            config.stripe = {
              publishableKey: edgeConfig.stripe.publishableKey,
              connectAccountId: edgeConfig.stripe.connectAccountId || config.stripe?.connectAccountId,
              applicationFeePercent: config.stripe?.applicationFeePercent || 1,
            };
          }
        }
      } catch (edgeError) {
        console.warn('Failed to load Edge Function config, using local config:', edgeError);
      }

      set(tenantConfigAtom, config);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error loading config';
      set(configErrorAtom, errorMessage);
      console.error('Failed to load config:', error);
    } finally {
      set(configLoadingAtom, false);
    }
  }
);

/**
 * Update pricing configuration (for admin use)
 */
export const updatePricingConfigAtom = atom(
  null,
  (get, set, updates: Partial<PricingConfig>) => {
    const config = get(tenantConfigAtom);
    if (!config) {
      throw new Error('Config not loaded');
    }

    set(tenantConfigAtom, {
      ...config,
      pricing: {
        ...config.pricing,
        ...updates,
      },
    });
  }
);

/**
 * Update Stripe configuration (for admin use)
 */
export const updateStripeConfigAtom = atom(
  null,
  (get, set, updates: Partial<StripeConfig>) => {
    const config = get(tenantConfigAtom);
    if (!config) {
      throw new Error('Config not loaded');
    }

    set(tenantConfigAtom, {
      ...config,
      stripe: {
        ...(config.stripe || {
          publishableKey: '',
          connectAccountId: '',
          applicationFeePercent: 1,
        }),
        ...updates,
      },
    });
  }
);
