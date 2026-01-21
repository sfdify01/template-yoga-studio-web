import { CartItem, Totals, TenantSettings } from './types';

/**
 * NOTE: Tax rates and service fees should come from tenant config.
 * These defaults are fallbacks only and should not be used in production.
 * @deprecated Use config atoms instead: taxRateAtom, serviceFeeRateAtom
 */
const DEFAULT_TAX_RATE = 0.0875; // 8.75% - Illinois default + local
const DEFAULT_SERVICE_FEE_RATE = 0.0; // 0% - No service fee by default

export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.subtotal, 0);
}

export function calculateTax(
  subtotal: number,
  taxRate: number = DEFAULT_TAX_RATE
): number {
  return Math.round(subtotal * taxRate * 100) / 100;
}

export function calculateServiceFee(
  subtotal: number,
  serviceFeeRate: number = DEFAULT_SERVICE_FEE_RATE
): number {
  return Math.round(subtotal * serviceFeeRate * 100) / 100;
}

export function calculateDeliveryFee(
  distance: number,
  settings: TenantSettings
): number {
  const zones = settings.integrations.delivery;
  
  if (!zones.enabled) return 0;

  // Simple zone-based fee (can be enhanced)
  if (distance <= 2) return 2.99;
  if (distance <= 5) return 4.99;
  if (distance <= 10) return 7.99;
  
  return 0; // Out of range
}

export function calculateTotals(
  items: CartItem[],
  deliveryFee: number = 0,
  tips: number = 0,
  discount: number = 0,
  taxRate: number = DEFAULT_TAX_RATE,
  serviceFeeRate: number = DEFAULT_SERVICE_FEE_RATE
): Totals {
  const subtotal = calculateSubtotal(items);
  const tax = calculateTax(subtotal, taxRate);
  const serviceFee = calculateServiceFee(subtotal, serviceFeeRate);
  const fees = serviceFee;

  const grandTotal = subtotal + tax + fees + deliveryFee + tips - discount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    tips: Math.round(tips * 100) / 100,
    fees: Math.round(fees * 100) / 100,
    delivery_fee: deliveryFee,
    service_fee: serviceFee,
    discount,
    grand_total: Math.round(grandTotal * 100) / 100,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function calculateItemSubtotal(
  basePrice: number,
  qty: number,
  mods?: { price: number }[]
): number {
  const modTotal = mods?.reduce((sum, mod) => sum + mod.price, 0) || 0;
  return (basePrice + modTotal) * qty;
}
