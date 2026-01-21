import { publicAnonKey } from '../../utils/supabase/info';
import { edgeFunctionBaseUrl } from '../supabase-edge';
import type { OrderDetails } from '../orders/types';

type OrderListFilters = {
  status?: string;
  fulfillment?: 'pickup' | 'delivery';
  limit?: number;
};

async function adminRequest<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${edgeFunctionBaseUrl}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: publicAnonKey,
      ...(init?.headers || {}),
    },
    credentials: 'include',
    body: init?.body,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      data?.details ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return (data ?? {}) as T;
}

export async function fetchAdminOrders(
  token: string,
  filters: OrderListFilters = {}
): Promise<OrderDetails[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.fulfillment) params.set('fulfillment', filters.fulfillment);
  if (filters.limit) params.set('limit', String(filters.limit));

  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await adminRequest<{ orders: OrderDetails[] }>(
    `/admin/orders${query}`,
    token
  );
  return data.orders ?? [];
}

export async function markOrderPickedUp(
  token: string,
  orderId: string
): Promise<OrderDetails> {
  const data = await adminRequest<{ order: OrderDetails }>(
    `/admin/orders/${orderId}/picked-up`,
    token,
    { method: 'POST' }
  );
  return data.order;
}

export async function cancelOrder(
  token: string,
  orderId: string,
  reason?: string
): Promise<OrderDetails> {
  const data = await adminRequest<{ order: OrderDetails }>(
    `/admin/orders/${orderId}/cancel`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }
  );
  return data.order;
}
