import { useState, useEffect } from 'react';
import { BlogPost } from '../components/blog/BlogPostCard';
import {
  TabsyAPI,
  getStoreSlug,
  type StoreConfig,
  type MenuResponse,
  type HoursResponse,
  type PromosResponse,
  type Promo,
} from '../lib/tabsy-api';
import type { PriceUnit } from '../atoms/cart';

// Legacy edge function imports for fallback
import { publicAnonKey } from '../utils/supabase/info';
import { edgeFunctionBaseUrl } from '../lib/supabase-edge';

export interface Config {
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
    reservations: {
      type: string;
      url: string;
    };
  };
  social: {
    instagram: string;
    facebook: string;
  };
  instagramFeed?: {
    enabled: boolean;
    handle: string;
    userId?: string;
    useMockData?: boolean;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
  announcement?: string;
  newsletter: boolean;
  loyalty?: {
    enabled: boolean;
    earnPerDollar: number;
    rewardThreshold: number;
    loyaltyHref: string;
  };
  features: {
    catering: boolean;
    events: boolean;
    giftCards: boolean;
    careers: boolean;
  };
  stripe?: {
    publishableKey: string;
    connectAccountId?: string;
    applicationFeePercent?: number;
  };
}

export interface Hours {
  timezone: string;
  schedule: {
    [key: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discountedPrice?: number;
  image: string;
  imageUrl?: string;
  dietary: string[];
  popular?: boolean;
  addOns?: string[];
  unit?: PriceUnit;
  unitLabel?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  items: MenuItem[];
}

export interface MenuData {
  categories: MenuCategory[];
  dietaryFilters: {
    id: string;
    label: string;
    icon: string;
  }[];
}

export interface BlogData {
  posts: BlogPost[];
  categories: Array<{ id: string; name: string; icon: string }>;
}

// Check if running in Tabsy-managed deployment (subdomain or env flag)
function isTabsyDeployment(): boolean {
  if (typeof window === 'undefined') {
    return !!import.meta.env.VITE_TABSY_API_URL || !!import.meta.env.VITE_STORE_SLUG;
  }
  const hostname = window.location.hostname;
  return hostname.endsWith('.tabsy.us') || !!import.meta.env.VITE_TABSY_API_URL;
}

// Convert Tabsy API config to legacy Config format
function convertApiConfigToLegacy(apiConfig: StoreConfig): Config {
  return {
    name: apiConfig.name,
    tagline: apiConfig.tagline,
    logo: apiConfig.logo,
    theme: apiConfig.theme,
    contact: apiConfig.contact,
    address: {
      line1: apiConfig.address?.line1 || '',
      city: apiConfig.address?.city || '',
      state: apiConfig.address?.state || '',
      zip: apiConfig.address?.zip || '',
      coordinates: { lat: 0, lng: 0 }, // Coordinates not yet in API
    },
    integrations: {
      pos: 'toast',
      ordering: apiConfig.integrations.ordering,
      pickup: apiConfig.integrations.pickup,
      delivery: apiConfig.integrations.delivery,
      reservations: { type: '', url: '' },
    },
    social: {
      instagram: apiConfig.social.instagram || '',
      facebook: apiConfig.social.facebook || '',
    },
    seo: apiConfig.seo,
    newsletter: apiConfig.newsletter,
    loyalty: apiConfig.loyalty ? {
      ...apiConfig.loyalty,
      loyaltyHref: '/loyalty',
    } : undefined,
    features: {
      catering: true,
      events: true,
      giftCards: true,
      careers: true,
    },
    stripe: apiConfig.stripe,
  };
}

// Convert Tabsy API menu to legacy MenuData format
function convertApiMenuToLegacy(apiMenu: MenuResponse): MenuData {
  const categories: MenuCategory[] = apiMenu.categories.map((cat, index) => ({
    id: `cat-${index}`,
    name: cat.name,
    description: '',
    icon: getCategoryIcon(cat.name),
    items: cat.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.priceCents / 100,
      image: item.imageUrl || '/placeholder.jpg',
      imageUrl: item.imageUrl,
      dietary: item.dietaryTags || [],
      unit: item.priceUnit as PriceUnit,
      unitLabel: item.priceUnit === 'per_lb' ? '/lb' : item.priceUnit === 'per_oz' ? '/oz' : undefined,
    })),
  }));

  const allDietaryTags = new Set<string>();
  apiMenu.categories.forEach((cat) => {
    cat.items.forEach((item) => {
      item.dietaryTags?.forEach((tag) => allDietaryTags.add(tag));
    });
  });

  const dietaryFilters = Array.from(allDietaryTags).map((tag) => ({
    id: tag.toLowerCase().replace(/\s+/g, '-'),
    label: tag,
    icon: getDietaryIcon(tag),
  }));

  return { categories, dietaryFilters };
}

function getCategoryIcon(name: string): string {
  const iconMap: Record<string, string> = {
    coffee: '☕', drinks: '🥤', beverages: '🧃', food: '🍽️', pastries: '🥐',
    breakfast: '🍳', lunch: '🥪', dinner: '🍝', desserts: '🍰', snacks: '🍿',
    meat: '🥩', beef: '🐄', lamb: '🐑', chicken: '🐔', seafood: '🐟',
    vegetables: '🥬', fruits: '🍎', dairy: '🧀', bakery: '🍞', default: '📦',
  };
  return iconMap[name.toLowerCase()] || iconMap.default;
}

function getDietaryIcon(tag: string): string {
  const iconMap: Record<string, string> = {
    vegetarian: '🥬', vegan: '🌱', 'gluten-free': '🌾', halal: '☪️',
    kosher: '✡️', organic: '🌿', 'dairy-free': '🥛', 'nut-free': '🥜',
    spicy: '🌶️', default: '🏷️',
  };
  return iconMap[tag.toLowerCase()] || iconMap.default;
}

// Static blog data (blog API not yet implemented)
const blogData: BlogData = {
  posts: [],
  categories: [
    { id: 'recipe', name: 'Recipe', icon: '🍝' },
    { id: 'guide', name: 'Guide', icon: '📖' },
    { id: 'news', name: 'News', icon: '📰' },
  ]
};

const EMPTY_MENU: MenuData = { categories: [], dietaryFilters: [] };

export const useConfig = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [hours, setHours] = useState<Hours | null>(null);
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [blog, setBlog] = useState<BlogData | null>(null);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchFromTabsyAPI = async () => {
      try {
        const slug = getStoreSlug();
        const api = new TabsyAPI(slug);

        const [configData, menuData, hoursData, promosData] = await Promise.all([
          api.getConfig().catch((err) => { console.warn('Config fetch failed:', err); return null; }),
          api.getMenu().catch((err) => { console.warn('Menu fetch failed:', err); return null; }),
          api.getHours().catch((err) => { console.warn('Hours fetch failed:', err); return null; }),
          api.getPromos().catch((err) => { console.warn('Promos fetch failed:', err); return null; }),
        ]);

        if (!isMounted) return;

        if (configData) {
          setConfig(convertApiConfigToLegacy(configData));
          console.log('✅ Config loaded from Tabsy API:', configData.name);
        }

        if (menuData) {
          setMenu(convertApiMenuToLegacy(menuData));
          console.log('✅ Menu loaded from Tabsy API:', menuData.totalItems, 'items');
        }

        if (hoursData) {
          setHours(hoursData);
          console.log('✅ Hours loaded from Tabsy API');
        }

        if (promosData) {
          setPromos(promosData.promos);
          console.log('✅ Promos loaded from Tabsy API:', promosData.count, 'active');
        }

        setBlog(blogData);
        setLoading(false);

        // If config or menu failed, throw to trigger fallback
        if (!configData || !menuData) {
          throw new Error('Partial data load - falling back to edge functions');
        }
      } catch (err) {
        console.warn('Tabsy API fetch failed, trying edge functions:', err);
        throw err;
      }
    };

    const fetchFromEdgeFunctions = async () => {
      // Fallback to direct edge function calls (original implementation)
      try {
        const menuResponse = await fetch(`${edgeFunctionBaseUrl}/menu`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'apikey': publicAnonKey,
            'x-tenant-id': typeof window !== 'undefined' ? window.location.hostname : '',
          },
        });

        if (menuResponse.ok) {
          const data = await menuResponse.json();
          if (isMounted && data?.categories) {
            setMenu(data);
            console.log('✅ Menu loaded from edge function:', data.categories.length, 'categories');
          }
        } else {
          if (isMounted) setMenu(EMPTY_MENU);
        }
      } catch (err) {
        console.error('Edge function menu fetch failed:', err);
        if (isMounted) setMenu(EMPTY_MENU);
      }

      if (isMounted) {
        setBlog(blogData);
        setLoading(false);
      }
    };

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      if (isTabsyDeployment()) {
        // Try Tabsy API first for Tabsy-managed deployments
        try {
          await fetchFromTabsyAPI();
        } catch {
          // Fallback to edge functions
          await fetchFromEdgeFunctions();
        }
      } else {
        // Non-Tabsy deployment - use edge functions directly
        await fetchFromEdgeFunctions();
      }
    };

    fetchData();

    return () => { isMounted = false; };
  }, []);

  return { config, hours, menu, blog, promos, loading, error };
};
