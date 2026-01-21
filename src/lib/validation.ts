import { z } from 'zod';

// Order validation schemas
export const OrderItemSchema = z.object({
  sku: z.string().min(1),
  qty: z.number().int().positive(),
  mods: z.array(z.object({ id: z.string() })).optional(),
  note: z.string().max(200).optional(),
});

export const CustomerSchema = z.object({
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  phone: z.string().regex(/^\+?1?\d{10}$/),
  email: z.union([z.string().email(), z.literal('')]).optional(),
});

export const DeliverySchema = z.object({
  address: z.string().min(5),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  instructions: z.string().max(200).optional(),
});

export const TotalsSchema = z.object({
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  tips: z.number().nonnegative(),
  fees: z.number().nonnegative(),
  delivery_fee: z.number().nonnegative().optional(),
  service_fee: z.number().nonnegative().optional(),
  grand_total: z.number().positive(),
});

export const OrderInputSchema = z.object({
  fulfillment: z.enum(['pickup', 'delivery']),
  when: z.enum(['asap', 'scheduled']),
  scheduled_at: z.string().datetime().optional(),
  store_id: z.string(),
  items: z.array(OrderItemSchema).min(1),
  customer: CustomerSchema,
  delivery: DeliverySchema.optional(),
  payments: z.array(
    z.object({
      type: z.enum(['card', 'pos']),
      intent_id: z.string().optional(),
    })
  ),
  totals: TotalsSchema,
  meta: z.object({
    channel: z.literal('tabsy-web'),
    pos: z.enum(['toast', 'square']),
    courier: z.enum(['doordash', 'uber']).optional(),
    tenant: z.string(),
  }),
});

// Validate delivery address is within zone
export function validateDeliveryZone(
  lat: number,
  lng: number,
  storeLat: number,
  storeLng: number,
  maxDistance: number = 10
): { valid: boolean; distance: number } {
  const distance = calculateDistance(lat, lng, storeLat, storeLng);
  return {
    valid: distance <= maxDistance,
    distance,
  };
}

// Haversine formula for distance calculation
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export { calculateDistance };
