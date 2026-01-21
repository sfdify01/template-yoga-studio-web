import { TenantSettings } from './types';

// Domain-based tenant resolver
export async function resolveTenant(hostname?: string, queryTenant?: string): Promise<string> {
  // Allow query param override for development
  if (queryTenant) {
    return queryTenant;
  }

  // Map domains to tenant slugs
  const domainMap: Record<string, string> = {
    'localhost': 'demo',
    'demo.tabsy.com': 'demo',
    // Add more domain mappings here
  };

  if (hostname && domainMap[hostname]) {
    return domainMap[hostname];
  }

  // Default fallback
  return 'demo';
}

// Load tenant settings
export async function getTenantSettings(slug: string): Promise<TenantSettings> {
  try {
    const response = await fetch(`/tenants/${slug}/settings.json`);
    if (!response.ok) {
      throw new Error(`Failed to load tenant settings for ${slug}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to load tenant settings:', error);
    throw error;
  }
}

// Load tenant settings (client-side compatible)
export async function loadTenantSettings(slug: string): Promise<TenantSettings> {
  try {
    // For client-side, use fetch to load JSON
    const response = await fetch(`/tenants/${slug}/settings.json`);
    if (!response.ok) {
      throw new Error(`Failed to load tenant settings for ${slug}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to load tenant ${slug}:`, error);
    throw new Error(`Tenant ${slug} not found`);
  }
}

// Generate CSS variables from theme
export function generateThemeVars(theme: TenantSettings['theme']): Record<string, string> {
  return {
    '--color-brand': theme.brand,
    '--color-accent': theme.accent,
    '--color-bg': theme.bg,
    '--color-text': theme.text,
    '--radius': theme.radius,
  };
}

// Client-side hook for tenant context
export function useTenant() {
  // This will be implemented as a React context provider
  // For now, return demo data
  return {
    slug: 'demo',
    settings: null as TenantSettings | null,
    loading: true,
  };
}
