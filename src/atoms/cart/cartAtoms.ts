import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { CartItem, CartTotals } from './types';
import {
  DEFAULT_PLATFORM_FEE_RATE,
  calculatePlatformFee,
  estimateStripeProcessingFee,
} from '../../lib/orders/fees';
import { taxRateAtom, serviceFeeRateAtom } from '../config/configAtoms';
import {
  getUnitDecimals,
  getUnitMinimum,
  normalizeUnit,
} from '../../lib/units';
import { promoDiscountCentsAtom, promoInfoAtom, clearPromoAtom } from '../promo/promoAtoms';

const CART_STORAGE_KEY = 'tabsy-cart';
const CART_DRAWER_STORAGE_KEY = 'tabsy-cart-drawer';
const FULFILLMENT_STORAGE_KEY = 'tabsy-fulfillment-type';
const DELIVERY_ADDRESS_STORAGE_KEY = 'tabsy-delivery-address';

const generateLineKey = (item: Omit<CartItem, 'id' | '_key'>) => {
  const sortedMods = [...(item.mods || [])]
    .map((mod) => ({
      id: mod.id,
      name: mod.name,
      price: mod.price || 0,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return JSON.stringify({
    sku: item.sku,
    mods: sortedMods,
    note: (item.note || '').trim(),
  });
};

const calculateTotals = (
  items: CartItem[],
  tipPercentage: number,
  customTip: number,
  promoDiscountCents: number,
  taxRate: number,
  serviceFeeRate: number,
  fulfillmentType: 'pickup' | 'delivery' = 'pickup',
  deliveryFee: number = 0
): CartTotals => {
  // Round each line item to avoid fractional cents (e.g., 0.25 lb @ $22.99/lb = $5.7475)
  const subtotal = items.reduce((sum, item) => {
    const modsTotal =
      item.mods?.reduce((acc, mod) => acc + (mod.price || 0), 0) || 0;
    const lineTotal = Math.round((item.price + modsTotal) * item.qty);
    return sum + lineTotal;
  }, 0);

  // Apply promo discount (capped at subtotal)
  const discountAmount = Math.min(promoDiscountCents, subtotal);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  const tax = Math.round(discountedSubtotal * taxRate);

  const tips =
    customTip > 0
      ? customTip
      : Math.round(discountedSubtotal * (tipPercentage / 100));

  // Tabsy Platform Fee defaults to 1% but can be overridden by config
  const platformFeeRate =
    serviceFeeRate && serviceFeeRate > 0
      ? serviceFeeRate
      : DEFAULT_PLATFORM_FEE_RATE;
  const platformFee = calculatePlatformFee(discountedSubtotal, platformFeeRate);
  const serviceFee = platformFee; // Service fee = platform fee only

  const grand_total =
    discountedSubtotal + tax + tips + serviceFee + (deliveryFee || 0);
  const stripeFeeEstimate = estimateStripeProcessingFee(grand_total);
  const courierTip = fulfillmentType === 'delivery' ? tips : 0;
  const netPayoutEstimate = Math.max(
    grand_total - stripeFeeEstimate - serviceFee - (deliveryFee || 0) - courierTip,
    0
  );

  return {
    subtotal: discountedSubtotal,
    tax,
    fees: serviceFee,
    tips,
    grand_total,
    serviceFee, // Tabsy 1% platform fee (shown to customer)
    platformFee, // Same as serviceFee - used for Stripe application_fee_amount
    deliveryFee: deliveryFee || undefined,
    discount: discountAmount,
    stripeFeeEstimate,
    fulfillmentType,
    courier: fulfillmentType === 'delivery' ? 'uber_direct' : null,
    breakdown: {
      subtotal: discountedSubtotal,
      deliveryFee: deliveryFee || 0,
      tabsyFee: platformFee,
      stripeProcessingFee: stripeFeeEstimate,
      tax,
      tip: tips,
      discount: discountAmount,
      total: grand_total,
      netPayoutEstimate,
    },
  };
};

export const cartItemsAtom = atomWithStorage<CartItem[]>(CART_STORAGE_KEY, []);

export const cartDrawerAtom = atomWithStorage<boolean>(
  CART_DRAWER_STORAGE_KEY,
  false
);

export const cartMinimizedAtom = atom<boolean>(false);

export const couponCodeAtom = atomWithStorage<string>('tabsy-cart-coupon', '');
export const tipPercentageAtom = atomWithStorage<number>(
  'tabsy-cart-tip-percentage',
  0
);
export const customTipAtom = atomWithStorage<number>(
  'tabsy-cart-tip-custom',
  0
);

// Guest customer info for checkout (optional fields)
export const guestEmailAtom = atomWithStorage<string>(
  'tabsy-guest-email',
  ''
);
export const guestNameAtom = atomWithStorage<string>(
  'tabsy-guest-name',
  ''
);
export const guestPhoneAtom = atomWithStorage<string>(
  'tabsy-guest-phone',
  ''
);

type DeliveryAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  instructions: string;
  country?: string;
};

const defaultDeliveryAddress: DeliveryAddress = {
  line1: '',
  line2: '',
  city: '',
  state: 'IL',
  zip: '',
  instructions: '',
  country: 'US',
};

export const fulfillmentTypeAtom = atomWithStorage<'pickup' | 'delivery' | null>(
  FULFILLMENT_STORAGE_KEY,
  null
);

export const deliveryAddressAtom = atomWithStorage<DeliveryAddress>(
  DELIVERY_ADDRESS_STORAGE_KEY,
  defaultDeliveryAddress
);

export const resetDeliveryAddressAtom = atom(null, (_get, set) => {
  set(deliveryAddressAtom, { ...defaultDeliveryAddress });
});

// SMS consent for order updates and notifications
export const smsConsentAtom = atomWithStorage<boolean>(
  'tabsy-sms-consent',
  false
);

export const cartTotalsAtom = atom((get) => {
  const taxRate = get(taxRateAtom);
  const serviceFeeRate = get(serviceFeeRateAtom);
  const fulfillmentType: 'pickup' | 'delivery' = 'pickup';
  const deliveryFee = fulfillmentType === 'delivery' ? 0 : 0;
  const promoDiscount = get(promoDiscountCentsAtom);

  return calculateTotals(
    get(cartItemsAtom),
    get(tipPercentageAtom),
    get(customTipAtom),
    promoDiscount,
    taxRate,
    serviceFeeRate,
    fulfillmentType,
    deliveryFee
  );
});

// Derived atom for getting the raw subtotal (before any discounts)
export const cartSubtotalAtom = atom((get) => {
  const items = get(cartItemsAtom);
  return items.reduce((sum, item) => {
    const modsTotal =
      item.mods?.reduce((acc, mod) => acc + (mod.price || 0), 0) || 0;
    const lineTotal = Math.round((item.price + modsTotal) * item.qty);
    return sum + lineTotal;
  }, 0);
});

// Derived atom for getting the applied promo info
export const appliedPromoAtom = atom((get) => get(promoInfoAtom));

export const cartItemCountAtom = atom((get) =>
  get(cartItemsAtom).reduce((sum, item) => sum + item.qty, 0)
);

export const addCartItemAtom = atom(
  null,
  (get, set, item: Omit<CartItem, 'id' | '_key'>) => {
    const normalizedUnit = normalizeUnit(item.priceUnit);
    const normalizedItem = { ...item, priceUnit: normalizedUnit };
    const key = generateLineKey(normalizedItem);
    const items = get(cartItemsAtom);
    const existingIndex = items.findIndex((line) => line._key === key);

    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex] = {
        ...updated[existingIndex],
        qty: updated[existingIndex].qty + (normalizedItem.qty || 1),
      };
      set(cartItemsAtom, updated);
    } else {
      const id = `line-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;
      set(cartItemsAtom, [...items, { ...normalizedItem, id, _key: key }]);
    }

    set(cartDrawerAtom, true);
    set(cartMinimizedAtom, false); // Auto-expand cart when adding items
  }
);

export const removeCartItemAtom = atom(null, (get, set, id: string) => {
  const updatedItems = get(cartItemsAtom).filter((item) => item.id !== id);
  set(cartItemsAtom, updatedItems);

  // Reset minimized state if cart is now empty
  if (updatedItems.length === 0) {
    set(cartMinimizedAtom, false);
  }
});

export const setCartItemQtyAtom = atom(
  null,
  (get, set, { id, qty }: { id: string; qty: number }) => {
    const items = get(cartItemsAtom);
    const target = items.find((item) => item.id === id);
    if (!target) return;

    const minQty = getUnitMinimum(target.priceUnit);
    const decimals = getUnitDecimals(target.priceUnit);
    const isInvalid = Number.isNaN(qty) || qty <= 0;

    if (isInvalid || qty < minQty) {
      const updatedItems = items.filter((item) => item.id !== id);
      set(cartItemsAtom, updatedItems);
      if (updatedItems.length === 0) {
        set(cartMinimizedAtom, false);
      }
      return;
    }

    const normalizedQty =
      decimals > 0 ? Number(qty.toFixed(decimals)) : Math.round(qty);

    set(
      cartItemsAtom,
      items.map((item) =>
        item.id === id ? { ...item, qty: normalizedQty } : item
      )
    );
  }
);

export const updateCartItemNoteAtom = atom(
  null,
  (get, set, { id, note }: { id: string; note: string }) => {
    set(
      cartItemsAtom,
      get(cartItemsAtom).map((item) =>
        item.id === id ? { ...item, note } : item
      )
    );
  }
);

export const clearCartAtom = atom(null, (_get, set) => {
  set(cartItemsAtom, []);
  set(couponCodeAtom, '');
  set(tipPercentageAtom, 0);
  set(customTipAtom, 0);
  set(fulfillmentTypeAtom, null);
  set(resetDeliveryAddressAtom, null);
  set(cartMinimizedAtom, false); // Reset minimized state when clearing cart
  set(clearPromoAtom); // Clear any applied promo code
  // Note: We keep guest info (email, name, phone) for next order
});

export const clearGuestInfoAtom = atom(null, (_get, set) => {
  set(guestEmailAtom, '');
  set(guestNameAtom, '');
  set(guestPhoneAtom, '');
});

export const openCartDrawerAtom = atom(null, (_get, set) =>
  set(cartDrawerAtom, true)
);
export const closeCartDrawerAtom = atom(null, (_get, set) =>
  set(cartDrawerAtom, false)
);
