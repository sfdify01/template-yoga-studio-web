export type CartModifier = {
  id: string;
  name: string;
  price?: number;
};

export type CanonicalPriceUnit =
  | 'each'
  | 'lb'
  | 'oz'
  | 'kg'
  | 'g'
  | 'dozen'
  | 'pack'
  | 'l'
  | 'ml';

// Accept common aliases but normalize to CanonicalPriceUnit in atoms/utilities
export type PriceUnit =
  | CanonicalPriceUnit
  | 'lbs'
  | 'pound'
  | 'pounds'
  | 'ounce'
  | 'ounces'
  | 'liter'
  | 'litre';

export type CartItem = {
  id: string;
  sku: string;
  name: string;
  price: number; // cents per unit
  priceUnit?: PriceUnit; // unit for pricing (defaults to 'each'), normalized to canonical form
  unitLabel?: string; // optional display label (per pack, per bag, etc.)
  qty: number; // can be decimal for weight-based items (e.g., 1.5 lb)
  image?: string;
  mods?: CartModifier[];
  note?: string;
  metadata?: Record<string, any>;
  _key?: string;
};

export type CartFeeBreakdown = {
  subtotal: number;
  deliveryFee: number;
  tabsyFee: number;
  stripeProcessingFee: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
  netPayoutEstimate: number;
};

export type CartTotals = {
  subtotal: number;
  tax: number;
  fees: number;
  tips: number;
  grand_total: number;
  serviceFee?: number;
  platformFee?: number;
  deliveryFee?: number;
  discount?: number;
  stripeFeeEstimate?: number;
  fulfillmentType?: 'pickup' | 'delivery';
  courier?: string | null;
  breakdown?: CartFeeBreakdown;
};

export type CartDrawerState = {
  isOpen: boolean;
};

export type CartPreferences = {
  couponCode: string;
  tipPercentage: number;
  customTip: number;
};
