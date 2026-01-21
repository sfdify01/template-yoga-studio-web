import type { OrderDetails, OrderLineItem, LoyaltySummary } from './types';
import { normalizeOrderStatus } from '../state';
import { formatQuantityDisplay } from '../units';

const ORDERS_KEY = 'tabsy-orders';

export type StoredOrder = {
  id: string;
  mode: 'pickup' | 'delivery';
  status: string;
  customer: {
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  items: Array<{ name: string; qty: number; price: number; quantityDisplay?: string }>;
  totals: {
    subtotal: number;
    tax: number;
    fees: number;
    tips: number;
    grand_total: number;
  };
  placedAt: string;
  eta: string;
  loyalty?: LoyaltySummary | null;
};

function centsToDollars(value?: number | null): number {
  if (!value) return 0;
  return value / 100;
}

function mapItems(items: OrderLineItem[]): Array<{ name: string; qty: number; price: number; quantityDisplay?: string }> {
  return items.map((item) => ({
    name: item.name,
    qty: item.quantity,
    quantityDisplay:
      item.quantityDisplay || formatQuantityDisplay(item.quantity, item.unit || undefined),
    price:
      item.quantity > 0
        ? (item.totalPriceCents / item.quantity) / 100
        : item.unitPriceCents / 100,
  }));
}

export function saveOrderToHistory(order: OrderDetails, loyalty?: LoyaltySummary | null) {
  if (typeof window === 'undefined') return;

  const stored: StoredOrder[] = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');

  const record: StoredOrder = {
    id: order.id,
    mode: order.fulfillmentType,
    status: normalizeOrderStatus(order.status),
    customer: {
      name: order.contact.name,
      email: order.contact.email,
      phone: order.contact.phone,
    },
    items: mapItems(order.items),
    totals: {
      subtotal: centsToDollars(order.totals.subtotalCents),
      tax: centsToDollars(order.totals.taxCents),
      fees: centsToDollars((order.totals.serviceFeeCents ?? 0) + (order.totals.deliveryFeeCents ?? 0)),
      tips: centsToDollars(order.totals.tipCents),
      grand_total: centsToDollars(order.totals.totalCents),
    },
    placedAt: order.createdAt,
    eta: order.deliveryEta || order.pickupEta || order.createdAt,
    loyalty,
  };

  stored.unshift(record);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(stored.slice(0, 50)));
}
