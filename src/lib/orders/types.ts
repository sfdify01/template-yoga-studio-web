import type { PriceUnit } from '../../atoms/cart';

export type OrderLineItem = {
  id: string;
  sku: string | null;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  unitPriceCents: number;
  quantity: number;
  totalPriceCents: number;
  modifiers: { id: string; name: string; price?: number }[];
  note?: string | null;
  unit?: PriceUnit | null;
  unitLabel?: string | null;
  quantityDisplay?: string | null;
};

export type OrderTotals = {
  subtotalCents: number;
  taxCents: number;
  serviceFeeCents: number;
  deliveryFeeCents: number;
  tipCents: number;
  discountCents: number;
  totalCents: number;
};

export type PaymentBreakdown = {
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

export type PaymentIntentOrderItem = {
  sku?: string;
  name: string;
  qty: number;
  unitPriceCents: number;
  totalPriceCents: number;
  modifiers?: string[];
  note?: string;
  unit?: PriceUnit;
  unitLabel?: string;
  quantityDisplay?: string;
};

export type OrderTimelineEvent = {
  id: number;
  status: string | null;
  title: string;
  detail?: string | null;
  actor: string;
  createdAt: string;
};

export type OrderContact = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type OrderDeliveryAddress = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  instructions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type OrderDetails = {
  id: string;
  orderNumber: number | null;
  shortCode: string;
  tenantId: string;
  customerId: string | null;
  fulfillmentType: 'pickup' | 'delivery';
  status: string;
  paymentStatus: string;
  scheduledFor?: string | null;
  pickupEta?: string | null;
  deliveryEta?: string | null;
  contact: OrderContact;
  deliveryAddress?: OrderDeliveryAddress | null;
  totals: OrderTotals;
  items: OrderLineItem[];
  events: OrderTimelineEvent[];
  timestamps: Record<string, string>;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryQuote = {
  provider: 'uber';
  quoteId: string;
  feeCents: number;
  currency: string;
  etaMinutes?: number | null;
  expiresAt: string;
  pickupAddressPayload: string;
  dropoffAddressPayload: string;
};

export type DeliveryAddressInput = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  instructions?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
};

export type CreateOrderPayload = {
  fulfillmentType: 'pickup' | 'delivery';
  items: Array<{
    sku?: string;
    name: string;
    price: number; // cents
    qty: number;
    image?: string;
    mods?: { id: string; name: string; price?: number }[];
    note?: string;
    unit?: PriceUnit;
    unitLabel?: string;
    quantityDisplay?: string;
  }>;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  delivery?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    instructions?: string;
    latitude?: number;
    longitude?: number;
  };
  totals: {
    subtotal: number;
    tax: number;
    serviceFee: number;
    deliveryFee?: number;
    tip: number;
    discount?: number;
    total: number;
  };
  tipMode?: 'percent' | 'amount';
  couponCode?: string;
  metadata?: Record<string, any>;
  breakdown?: PaymentBreakdown;
  orderItemsSummary?: string;
  deliveryQuote?: DeliveryQuote;
  paymentIntentId?: string;
  testSpecifications?: Record<string, any>;
  promoId?: string;
  promoCode?: string;
};

export type LoyaltySummary = {
  profileId: string;
  starsEarned: number;
  newBalance: number;
  referralCode?: string | null;
  awardedAt: string;
};

export type CreateOrderResponse = {
  order: OrderDetails;
  loyalty?: LoyaltySummary | null;
};

export interface CheckoutFormData {
  customer: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  };
  delivery?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    instructions?: string;
  };
  paymentMethod: 'card' | 'apple_pay' | 'google_pay' | 'pos';
  paymentIntentId?: string;
}

export type PlaceOrderParams = {
  form: CheckoutFormData;
  deliveryType: 'pickup' | 'delivery';
  totals: {
    subtotal: number;
    deliveryFee?: number;
    serviceFee: number;
    tax: number;
    tip: number;
    total: number;
    discount?: number;
  };
  tipMode?: 'percent' | 'amount';
  couponCode?: string;
  deliveryQuote?: DeliveryQuote | null;
  promoId?: string;
  promoCode?: string;
};

export type CreatePaymentIntentRequest = {
  amount: number;
  subtotal: number;
  tax: number;
  serviceFee: number;
  deliveryFee?: number;
  tip: number;
  discount?: number;
  currency?: string;
  platformFee?: number;
  stripeFeeEstimate?: number;
  deliveryProvider?: string;
  fulfillmentType?: 'pickup' | 'delivery';
  breakdown?: PaymentBreakdown;
  orderItems?: PaymentIntentOrderItem[];
  orderItemsSummary?: string;
  paymentIntentId?: string;
  customer: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
};

export type CreatePaymentIntentResponse = {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  reused?: boolean;
};

export type CreateDeliveryQuoteRequest = {
  address: DeliveryAddressInput;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    size?: string;
    weight?: number;
    unit?: PriceUnit;
    quantityDisplay?: string;
    rawQuantity?: number;
  }>;
};

export type CreateDeliveryQuoteResponse = {
  quote: DeliveryQuote;
};

export type StripePublicConfig = {
  publishableKey: string;
  currency: string;
  connectAccountId?: string | null;
  applicationFeeBps?: number | null;
};
