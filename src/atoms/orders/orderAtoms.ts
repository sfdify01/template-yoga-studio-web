import { atom } from 'jotai';
import {
  CartItem,
  cartItemsAtom,
  couponCodeAtom,
  clearCartAtom,
} from '../cart';
import {
  createOrder,
  customerCancelOrder,
  calculateEditWindowRemaining,
  type CustomerCancelResponse,
} from '../../lib/orders/api';
import type {
  OrderDetails,
  PlaceOrderParams,
  CreateOrderPayload,
  CreateOrderResponse,
} from '../../lib/orders/types';
import { estimateStripeProcessingFee, UBER_MAX_TIP_CENTS } from '../../lib/orders/fees';
import { buildOrderItemsSummary } from '../../lib/orders/orderMetadata';
import { formatQuantityDisplay, normalizeUnit } from '../../lib/units';

export const lastPlacedOrderAtom = atom<OrderDetails | null>(null);

export const orderSubmissionStatusAtom = atom<
  'idle' | 'submitting' | 'success' | 'error'
>('idle');

const buildPayload = (
  params: PlaceOrderParams,
  items: CartItem[],
  couponCode?: string
): CreateOrderPayload => {
  const getClientTimezone = (): string | undefined => {
    if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat !== 'function') {
      return undefined;
    }
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return undefined;
    }
  };

  const getClientEnvironment = () => {
    if (typeof window === 'undefined') return 'production';
    const host = window.location.hostname?.toLowerCase?.() || '';
    if (host === 'localhost' || host === '127.0.0.1') return 'local';
    if (host.endsWith('.localhost')) return 'local';
    return 'production';
  };

  const getLocalUberTestSpec = () => {
    if (typeof window === 'undefined') return undefined;
    try {
      const raw = window.localStorage.getItem('tabsy-uber-test-spec');
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to parse tabsy-uber-test-spec:', error);
    }
    return undefined;
  };

  // Ensure all values are integers (cents) to avoid payment amount mismatch
  const subtotal = Math.round(params.totals.subtotal);
  const deliveryFee = Math.round(params.totals.deliveryFee || 0);
  const serviceFee = Math.round(params.totals.serviceFee);
  const tax = Math.round(params.totals.tax);

  // Cap tip at Uber's maximum for delivery orders
  const rawTip = Math.round(params.totals.tip);
  const tip = params.deliveryType === 'delivery'
    ? Math.min(rawTip, UBER_MAX_TIP_CENTS)
    : rawTip;

  // Log if tip was capped
  if (params.deliveryType === 'delivery' && rawTip > UBER_MAX_TIP_CENTS) {
    console.warn(`⚠️ Tip capped from ${rawTip} to ${UBER_MAX_TIP_CENTS} cents (Uber Direct maximum)`);
  }

  const discount = Math.round(params.totals?.discount || 0);
  // Round total to ensure integer cents (prevents floating-point precision issues)
  const total = Math.round(subtotal + deliveryFee + serviceFee + tax + tip - discount);
  const stripeFeeEstimate = estimateStripeProcessingFee(total);
  const courierTipCents =
    params.deliveryType === 'delivery' ? Math.max(tip, 0) : 0;
  const netPayoutEstimate = Math.max(
    total - stripeFeeEstimate - serviceFee - deliveryFee - courierTipCents,
    0
  );
  const environment = getClientEnvironment();
  const storedTestSpec = environment === 'local' ? getLocalUberTestSpec() : undefined;
  const testSpecifications = storedTestSpec || undefined;
  const hasCustomTestSpec = Boolean(storedTestSpec);
  const orderItemsSummary = buildOrderItemsSummary(items);
  const customerTimezone = getClientTimezone();

  const safeFulfillmentType: 'pickup' | 'delivery' =
    params.deliveryType === 'delivery' ? 'delivery' : 'pickup';

  return {
    fulfillmentType: safeFulfillmentType,
    items: items.map((item) => {
      const unit = normalizeUnit(item.priceUnit);
      return {
        sku: item.sku,
        name: item.name,
        price: item.price,
        qty: item.qty,
        image: item.image,
        mods: item.mods,
        note: item.note,
        unit,
        unitLabel: item.unitLabel,
        quantityDisplay: formatQuantityDisplay(item.qty, unit),
      };
    }),
    customer: {
      firstName: params.form.customer.first_name,
      lastName: params.form.customer.last_name,
      phone: params.form.customer.phone,
      email: params.form.customer.email,
    },
    delivery:
      safeFulfillmentType === 'delivery' && params.form.delivery
        ? {
            line1: params.form.delivery.line1,
            line2: params.form.delivery.line2,
            city: params.form.delivery.city,
            state: params.form.delivery.state,
            zip: params.form.delivery.zip,
            instructions: params.form.delivery.instructions,
          }
        : undefined,
    totals: {
      subtotal,
      tax,
      serviceFee,
      deliveryFee,
      tip,
      discount,
      total,
    },
    tipMode: params.tipMode,
    couponCode,
    breakdown: {
      subtotal,
      deliveryFee,
      tabsyFee: serviceFee,
      stripeProcessingFee: stripeFeeEstimate,
      tax,
      tip,
      discount,
      total,
      netPayoutEstimate,
    },
    orderItemsSummary: orderItemsSummary || undefined,
    metadata: {
      payment_method: params.form.paymentMethod,
      environment,
      uber_test_mode: hasCustomTestSpec ? 'custom' : 'live',
      order_items_summary: orderItemsSummary,
      delivery_provider:
        safeFulfillmentType === 'delivery' ? 'uber_direct' : 'pickup',
      tabsy_fee_cents: serviceFee,
      delivery_fee_cents: deliveryFee,
      stripe_fee_estimate_cents: stripeFeeEstimate,
      net_payout_estimate_cents: netPayoutEstimate,
      courier_tip_cents: courierTipCents,
      customer_timezone: customerTimezone,
    },
    deliveryQuote: params.deliveryQuote ?? undefined,
    paymentIntentId: params.form.paymentIntentId,
    testSpecifications,
    promoId: params.promoId,
    promoCode: params.promoCode,
  };
};

export const placeOrderAtom = atom(
  null,
  async (get, set, params: PlaceOrderParams): Promise<CreateOrderResponse> => {
    const items = get(cartItemsAtom);
    if (!items.length) {
      throw new Error('Your cart is empty');
    }

    console.log('📋 Place order params:', {
      deliveryType: params.deliveryType,
      hasDeliveryQuote: !!params.deliveryQuote,
      deliveryQuote: params.deliveryQuote,
      hasDeliveryAddress: !!params.form.delivery,
      deliveryAddress: params.form.delivery,
    });

    if (params.deliveryType === 'delivery' && !params.deliveryQuote) {
      throw new Error('Delivery quote not available yet. Please confirm your address.');
    }

    if (params.deliveryType === 'delivery' && params.deliveryQuote) {
      console.log('✅ Delivery quote validation:', {
        hasQuoteId: !!params.deliveryQuote.quoteId,
        quoteId: params.deliveryQuote.quoteId,
        hasFeeCents: params.deliveryQuote.feeCents !== undefined,
        feeCents: params.deliveryQuote.feeCents,
        deliveryFeeInTotals: params.totals.deliveryFee,
        feesMatch: params.deliveryQuote.feeCents === params.totals.deliveryFee,
      });

      if (!params.deliveryQuote.quoteId) {
        throw new Error('Delivery quote is missing quote ID. Please try selecting your address again.');
      }

      if (params.deliveryQuote.feeCents === undefined) {
        throw new Error('Delivery quote is missing fee information. Please try selecting your address again.');
      }

      if (params.deliveryQuote.feeCents !== params.totals.deliveryFee) {
        console.warn('⚠️ Delivery fee mismatch:', {
          quoteFee: params.deliveryQuote.feeCents,
          totalsFee: params.totals.deliveryFee,
        });
        throw new Error('Delivery fee mismatch. Please refresh and try again.');
      }
    }

    if (
      params.form.paymentMethod === 'card' &&
      !params.form.paymentIntentId
    ) {
      throw new Error('Payment authorization is still pending');
    }

    set(orderSubmissionStatusAtom, 'submitting');

    try {
      const payload = buildPayload(params, items, get(couponCodeAtom));
      console.log('📦 Order payload being sent:', {
        fulfillmentType: payload.fulfillmentType,
        hasDeliveryQuote: !!payload.deliveryQuote,
        deliveryQuote: payload.deliveryQuote,
        hasDelivery: !!payload.delivery,
        delivery: payload.delivery,
        totals: payload.totals,
      });
      const response = await createOrder(payload);
      console.log('✅ Order created successfully:', response.order.id);
      set(lastPlacedOrderAtom, response.order);
      set(orderSubmissionStatusAtom, 'success');
      set(clearCartAtom, null);
      return response;
    } catch (error) {
      console.error('❌ Order creation failed:', error);
      set(orderSubmissionStatusAtom, 'error');
      throw error;
    }
  }
);

// ---------------------------------------------------------------------------
// Order Cancel Atoms (3-minute cancel window)
// ---------------------------------------------------------------------------

export const orderCancelStatusAtom = atom<'idle' | 'cancelling' | 'success' | 'error'>('idle');

/**
 * Cancel an order within the 3-minute cancel window
 */
export const cancelOrderAtom = atom(
  null,
  async (
    _get,
    set,
    params: {
      orderId: string;
      customerPhone?: string;
      customerEmail?: string;
      reason?: string;
    }
  ): Promise<CustomerCancelResponse> => {
    set(orderCancelStatusAtom, 'cancelling');

    try {
      const response = await customerCancelOrder(params.orderId, {
        customerPhone: params.customerPhone,
        customerEmail: params.customerEmail,
        reason: params.reason,
      });

      set(orderCancelStatusAtom, 'success');
      return response;
    } catch (error) {
      console.error('Order cancellation failed:', error);
      set(orderCancelStatusAtom, 'error');
      throw error;
    }
  }
);

/**
 * Reset cancel status
 */
export const resetOrderCancelStatusAtom = atom(null, (_get, set) => {
  set(orderCancelStatusAtom, 'idle');
});

// Re-export helper function for convenience (used for cancel window timing)
export { calculateEditWindowRemaining };
