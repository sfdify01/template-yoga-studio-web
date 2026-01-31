/**
 * Tabsy API Client
 *
 * Fetches config, menu, hours, and promos from Tabsy API.
 * Auto-detects store slug from subdomain.
 */

// Tabsy API base URL
const TABSY_API_BASE = import.meta.env.VITE_TABSY_API_URL || 'https://tabsy.us';

/**
 * Extract store slug from hostname
 */
export function getStoreSlug(): string {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_STORE_SLUG || 'demo';
  }

  const hostname = window.location.hostname;

  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return import.meta.env.VITE_STORE_SLUG || 'demo';
  }

  // Extract subdomain from *.tabsy.us
  if (hostname.endsWith('.tabsy.us')) {
    const subdomain = hostname.replace('.tabsy.us', '');
    return subdomain.replace('test.', '');
  }

  // Custom domain - slug should be set in env
  return import.meta.env.VITE_STORE_SLUG || 'demo';
}

export interface StoreConfig {
  tenantId: string;
  slug: string;
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
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
  social: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
  integrations: {
    ordering: { enabled: boolean; mode: string };
    pickup: { enabled: boolean };
    delivery: { enabled: boolean; provider: string; max_distance_miles: number };
  };
  loyalty: {
    enabled: boolean;
    earnPerDollar: number;
    rewardThreshold: number;
  };
  stripe?: {
    publishableKey: string;
    connectAccountId: string;
    applicationFeePercent: number;
  };
  newsletter: boolean;
  isPublished: boolean;
  status: string;
  stripeConnected: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  priceCents: number;
  priceUnit: string;
  dietaryTags: string[];
  metadata?: Record<string, unknown>;
}

export interface MenuCategory {
  name: string;
  items: MenuItem[];
}

export interface MenuResponse {
  categories: MenuCategory[];
  totalItems: number;
}

export interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

export interface HoursResponse {
  timezone: string;
  schedule: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
}

export interface Promo {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minSubtotalCents?: number;
  maxDiscountCents?: number;
  startDate: string;
  expireDate?: string;
  bannerText?: string;
  bannerColor?: string;
  discountText: string;
}

export interface PromosResponse {
  promos: Promo[];
  count: number;
}

export class TabsyAPI {
  private slug: string;
  private baseUrl: string;

  constructor(slug?: string) {
    this.slug = slug || getStoreSlug();
    this.baseUrl = TABSY_API_BASE;
  }

  private buildUrl(endpoint: string): string {
    return `${this.baseUrl}/api/store/${this.slug}${endpoint}`;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const url = this.buildUrl(endpoint);
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Failed to fetch ${endpoint}`);
    }

    return response.json();
  }

  async getConfig(): Promise<StoreConfig> {
    return this.fetch<StoreConfig>('/config');
  }

  async getMenu(): Promise<MenuResponse> {
    return this.fetch<MenuResponse>('/menu');
  }

  async getHours(): Promise<HoursResponse> {
    return this.fetch<HoursResponse>('/hours');
  }

  async getPromos(): Promise<PromosResponse> {
    return this.fetch<PromosResponse>('/promo');
  }

  async validatePromo(
    code: string,
    subtotalCents: number,
    customerEmail?: string,
    customerPhone?: string
  ): Promise<{
    valid: boolean;
    promoId?: string;
    code?: string;
    name?: string;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    discountCents?: number;
    error?: string;
  }> {
    const url = this.buildUrl('/promo');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotalCents, customerEmail, customerPhone }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { valid: false, error: data.error };
    }
    return data;
  }
}

let apiInstance: TabsyAPI | null = null;

export function getTabsyAPI(): TabsyAPI {
  if (!apiInstance) {
    apiInstance = new TabsyAPI();
  }
  return apiInstance;
}
