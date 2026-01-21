import { publicAnonKey } from '../../utils/supabase/info';
import { edgeFunctionBaseUrl } from '../supabase-edge';
import type {
  CreateDeliveryQuoteRequest,
  CreateDeliveryQuoteResponse,
  CreateOrderPayload,
  CreateOrderResponse,
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  OrderDetails,
  StripePublicConfig,
} from './types';

const BASE_URL = edgeFunctionBaseUrl;
type OrderResponseEnvelope = { order: OrderDetails };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
      apikey: publicAnonKey,
      'x-tabsy-env': import.meta.env.VITE_ENV || 'prod',
      ...(init?.headers || {}),
    },
    ...init,
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
export async function createOrder(
  payload: CreateOrderPayload
): Promise<CreateOrderResponse> {
  return request<CreateOrderResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getOrderById(orderId: string): Promise<OrderDetails> {
  const data = await request<OrderResponseEnvelope>(`/orders/${orderId}`);
  return data.order;
}

export async function getOrderReceipt(
  orderId: string
): Promise<{ receiptUrl: string }> {
  return request<{ receiptUrl: string }>(`/orders/${orderId}/receipt`);
}

export async function trackOrder(reference: string): Promise<OrderDetails> {
  const data = await request<OrderResponseEnvelope>(
    `/orders/track/${encodeURIComponent(reference)}`
  );
  return data.order;
}

export async function createPaymentIntent(
  payload: CreatePaymentIntentRequest
): Promise<CreatePaymentIntentResponse> {
  return request<CreatePaymentIntentResponse>('/payments/intent', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getStripeConfig(): Promise<StripePublicConfig> {
  return request<StripePublicConfig>('/payments/config');
}

export async function createDeliveryQuote(
  payload: CreateDeliveryQuoteRequest
) {
  const data = await request<CreateDeliveryQuoteResponse>('/delivery/quote', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.quote;
}

// ---------------------------------------------------------------------------
// Customer Order Cancel API (3-minute cancel window)
// ---------------------------------------------------------------------------

export interface CustomerCancelRequest {
  customerPhone?: string;
  customerEmail?: string;
  reason?: string;
}

export interface CustomerCancelResponse {
  order: OrderDetails;
  refund: {
    status: 'refunded' | 'not_charged';
    amountCents?: number;
    amountFormatted?: string | null;
    processingFeeEstimate?: number;
    processingFeeNote?: string | null;
  };
}

/**
 * Cancel an order within the 3-minute cancel window
 */
export async function customerCancelOrder(
  orderId: string,
  payload: CustomerCancelRequest
): Promise<CustomerCancelResponse> {
  return request<CustomerCancelResponse>(`/orders/${orderId}/customer-cancel`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Calculate remaining cancel window time
 * Note: Function named "Edit" for backward compatibility but used for cancel window
 */
export function calculateEditWindowRemaining(orderCreatedAt: string): {
  remaining: number;
  remainingMs: number;
  remainingSeconds: number;
  expired: boolean;
  formattedTime: string;
} {
  const CANCEL_WINDOW_MS = 3 * 60 * 1000; // 3 minutes
  const createdAt = new Date(orderCreatedAt).getTime();
  const cancelWindowEnd = createdAt + CANCEL_WINDOW_MS;
  const now = Date.now();
  const remainingMs = Math.max(0, cancelWindowEnd - now);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const expired = remainingMs <= 0;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return { remaining: remainingSeconds, remainingMs, remainingSeconds, expired, formattedTime };
}
