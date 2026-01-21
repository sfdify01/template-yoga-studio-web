// Delivery zone configuration and fee calculation

interface DeliveryZone {
  type: 'radius';
  km: number;
  fee: number;
  minOrder: number;
  etaMin: number;
  label: string;
}

interface DeliveryQuote {
  ok: boolean;
  zone?: {
    label: string;
    feeCents: number;
    minOrderCents: number;
    etaMin: number;
  };
  distanceKm?: number;
  reason?: string;
}

interface RestaurantLocation {
  lat: number;
  lng: number;
}

/**
 * Load delivery zones from data file
 */
export async function loadDeliveryZones(): Promise<DeliveryZone[]> {
  try {
    const response = await fetch('/data/delivery-zones.json');
    const zones = await response.json();
    return zones;
  } catch (error) {
    console.error('Failed to load delivery zones:', error);
    return [];
  }
}

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Mock geocoding function - converts address to lat/lng
 * In production, use Google Maps Geocoding API or similar
 */
export async function geocodeAddress(address: {
  line1: string;
  city: string;
  state: string;
  zip: string;
}): Promise<{ lat: number; lng: number } | null> {
  // For demo purposes, generate a random location within a reasonable range
  // In production, use real geocoding API
  
  // Mock: Generate coordinates within ~20km of restaurant
  // This is just for demo - replace with real geocoding
  const mockLat = 41.77 + (Math.random() - 0.5) * 0.2; // ~±11km latitude
  const mockLng = -88.15 + (Math.random() - 0.5) * 0.2; // ~±11km longitude
  
  console.log('[DEMO] Mock geocoded address:', address, '→', { lat: mockLat, lng: mockLng });
  
  return { lat: mockLat, lng: mockLng };
}

/**
 * Get delivery quote for an address
 */
export async function getDeliveryQuote(
  restaurantLocation: RestaurantLocation,
  customerAddress: {
    line1: string;
    city: string;
    state: string;
    zip: string;
  },
  cartSubtotalCents: number
): Promise<DeliveryQuote> {
  try {
    // Geocode customer address
    const customerCoords = await geocodeAddress(customerAddress);
    if (!customerCoords) {
      return {
        ok: false,
        reason: 'INVALID_ADDRESS',
      };
    }

    // Calculate distance
    const distanceKm = calculateDistance(
      restaurantLocation.lat,
      restaurantLocation.lng,
      customerCoords.lat,
      customerCoords.lng
    );

    // Load delivery zones
    const zones = await loadDeliveryZones();
    if (zones.length === 0) {
      return {
        ok: false,
        reason: 'NO_ZONES_CONFIGURED',
      };
    }

    // Find matching zone (first zone that covers this distance)
    const matchingZone = zones
      .sort((a, b) => a.km - b.km) // Sort by distance ascending
      .find((zone) => distanceKm <= zone.km);

    if (!matchingZone) {
      return {
        ok: false,
        reason: 'OUT_OF_ZONE',
        distanceKm,
      };
    }

    // Check minimum order
    const minOrderCents = matchingZone.minOrder * 100;
    
    return {
      ok: true,
      zone: {
        label: matchingZone.label,
        feeCents: Math.round(matchingZone.fee * 100),
        minOrderCents,
        etaMin: matchingZone.etaMin,
      },
      distanceKm,
    };
  } catch (error) {
    console.error('Error getting delivery quote:', error);
    return {
      ok: false,
      reason: 'ERROR',
    };
  }
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Get restaurant location from config
 */
export function getRestaurantLocation(): RestaurantLocation {
  // In production, load from config
  return {
    lat: 41.77,
    lng: -88.15,
  };
}
