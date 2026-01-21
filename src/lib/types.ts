// Core ordering types for Tabsy platform

export type FulfillmentType = "pickup" | "delivery";
export type WhenType = "asap" | "scheduled";

export type OrderStatus =
  | "created"
  | "accepted"
  | "in_kitchen"
  | "ready"
  | "courier_requested"
  | "driver_en_route"
  | "picked_up"
  | "delivered"
  | "rejected"
  | "canceled"
  | "failed";

export interface MenuItem {
  sku: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;    // Original price before discount
  discountedPrice?: number;  // Discounted sale price
  category: string;
  image?: string;
  dietary?: string[];
  allergens?: string[];
  calories?: number;
  popular?: boolean;
  available?: boolean;
  modifiers?: ModifierGroup[];
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  min?: number;
  max?: number;
  options: ModifierOption[];
}

export interface ModifierOption {
  id: string;
  name: string;
  price: number;
  available?: boolean;
}

export interface CartItem {
  lineId: string;
  sku: string;
  name: string;
  price: number;
  qty: number;
  mods?: { id: string; name: string; price: number }[];
  note?: string;
  subtotal: number;
}

export interface OrderInput {
  fulfillment: FulfillmentType;
  when: WhenType;
  scheduled_at?: string; // ISO
  store_id: string;
  items: {
    sku: string;
    qty: number;
    mods?: { id: string }[];
    note?: string;
  }[];
  customer: {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
  };
  delivery?: {
    address: string;
    lat: number;
    lng: number;
    instructions?: string;
  };
  payments: { type: "card" | "pos"; intent_id?: string }[];
  totals: {
    subtotal: number;
    tax: number;
    tips: number;
    fees: number;
    delivery_fee?: number;
    service_fee?: number;
    grand_total: number;
  };
  meta: {
    channel: "tabsy-web";
    pos: "toast" | "square";
    courier?: "doordash" | "uber";
    tenant: string;
  };
}

export interface OrderRecord extends OrderInput {
  id: string;
  pos_order_id?: string;
  courier_job_id?: string;
  status: OrderStatus;
  timestamps: Record<string, string>;
  eta?: string;
  driver?: {
    name: string;
    phone: string;
    location?: { lat: number; lng: number };
  };
}

export interface TenantSettings {
  name: string;
  logo: string;
  theme: {
    brand: string;
    accent: string;
    bg: string;
    text: string;
    radius: string;
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
    lat: number;
    lng: number;
  };
  hours: string;
  menu: string;
  locations?: string;
  integrations: {
    pos: "toast" | "square";
    ordering: { mode: "pos" | "stripe" };
    reservations?: { type: string; url: string };
    delivery: {
      enabled: boolean;
      provider?: "doordash" | "uber";
      pickup_lead_min?: number;
      max_distance_miles?: number;
    };
    pickup: {
      enabled: boolean;
      curbside?: boolean;
    };
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  social?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  features?: {
    catering?: boolean;
    events?: boolean;
    giftCards?: boolean;
  };
}

export interface Location {
  id: string;
  name: string;
  address: {
    line1: string;
    city: string;
    state: string;
    zip: string;
    lat: number;
    lng: number;
  };
  hours: Record<string, { open: string; close: string; closed: boolean }>;
  phone: string;
  delivery_zones?: DeliveryZone[];
}

export interface DeliveryZone {
  radius_miles: number;
  fee: number;
  min_order?: number;
}

export interface TimeWindow {
  value: string; // ISO timestamp or "asap"
  label: string;
  available: boolean;
  eta?: string;
}

export interface TotalsBreakdown {
  subtotal: number;
  deliveryFee: number;
  tabsyFee: number;
  stripeProcessingFee: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
  netPayoutEstimate: number;
}

export interface Totals {
  subtotal: number;
  tax: number;
  tips: number;
  fees: number;
  delivery_fee?: number;
  service_fee?: number;
  discount?: number;
  grand_total: number;
  platform_fee?: number;
  stripe_fee_estimate?: number;
  courier?: string | null;
  breakdown?: TotalsBreakdown;
}

export interface CourierQuote {
  fee: number;
  eta_minutes: number;
  quote_id?: string;
}

export interface CourierJob {
  job_id: string;
  status: "pending" | "confirmed" | "driver_assigned" | "picked_up" | "delivered" | "canceled";
  driver?: {
    name: string;
    phone: string;
    location?: { lat: number; lng: number };
  };
  eta?: string;
  tracking_url?: string;
}
