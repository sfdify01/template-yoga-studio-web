// Cart and order state management with transitions

import { OrderStatus } from './types';

// Order status transitions
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  created: ['accepted', 'rejected', 'canceled'],
  accepted: ['in_kitchen', 'canceled'],
  in_kitchen: ['ready', 'canceled'],
  ready: ['courier_requested', 'picked_up', 'delivered', 'canceled'],
  courier_requested: ['driver_en_route', 'canceled', 'failed'],
  driver_en_route: ['picked_up', 'canceled', 'failed'],
  picked_up: ['delivered', 'failed'],
  delivered: [],
  rejected: [],
  canceled: [],
  failed: [],
};

const STATUS_ALIASES: Record<string, OrderStatus> = {
  confirmed: 'accepted',
  preparing: 'in_kitchen',
  out_for_delivery: 'picked_up',
};

// Check if transition is allowed
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) || false;
}

// Guard conditions for transitions
export function guardTransition(
  from: OrderStatus,
  to: OrderStatus,
  context: { fulfillment?: 'pickup' | 'delivery' }
): { allowed: boolean; reason?: string } {
  // Can't transition to same state
  if (from === to) {
    return { allowed: false, reason: 'Already in this state' };
  }

  // Check if transition is in allowed list
  if (!canTransition(from, to)) {
    return { allowed: false, reason: 'Invalid state transition' };
  }

  // Pickup orders can't request courier
  if (context.fulfillment === 'pickup' && to === 'courier_requested') {
    return { allowed: false, reason: 'Pickup orders do not use courier' };
  }

  // Delivery orders must request courier after ready
  if (
    context.fulfillment === 'delivery' &&
    from === 'ready' &&
    to !== 'courier_requested' &&
    to !== 'canceled'
  ) {
    return { allowed: false, reason: 'Delivery orders must request courier' };
  }

  return { allowed: true };
}

// Get next expected status
export function getNextStatus(
  current: OrderStatus,
  fulfillment: 'pickup' | 'delivery'
): OrderStatus | null {
  switch (current) {
    case 'created':
      return 'accepted';
    case 'accepted':
      return 'in_kitchen';
    case 'in_kitchen':
      return 'ready';
    case 'ready':
      return fulfillment === 'delivery' ? 'courier_requested' : 'delivered';
    case 'courier_requested':
      return 'driver_en_route';
    case 'driver_en_route':
      return 'picked_up';
    case 'picked_up':
      return 'delivered';
    default:
      return null;
  }
}

// Terminal states
export const TERMINAL_STATES: OrderStatus[] = [
  'delivered',
  'rejected',
  'canceled',
  'failed',
];

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATES.includes(status);
}

// Get display text for status
export function getStatusDisplay(status: OrderStatus): {
  label: string;
  description: string;
} {
  const displays: Record<OrderStatus, { label: string; description: string }> = {
    created: {
      label: 'Order Placed',
      description: 'Your order has been submitted',
    },
    accepted: {
      label: 'Confirmed',
      description: 'Restaurant has confirmed your order',
    },
    in_kitchen: {
      label: 'Preparing',
      description: 'Your food is being prepared',
    },
    ready: {
      label: 'Ready',
      description: 'Your order is ready',
    },
    courier_requested: {
      label: 'Finding Driver',
      description: 'Looking for a delivery driver',
    },
    driver_en_route: {
      label: 'Driver En Route',
      description: 'Driver is on the way to pick up',
    },
    picked_up: {
      label: 'Out for Delivery',
      description: 'Driver is delivering your order',
    },
    delivered: {
      label: 'Delivered',
      description: 'Your order has been delivered',
    },
    rejected: {
      label: 'Rejected',
      description: 'Order could not be fulfilled',
    },
    canceled: {
      label: 'Canceled',
      description: 'Order has been canceled',
    },
    failed: {
      label: 'Failed',
      description: 'An error occurred with your order',
    },
  };

  return displays[status];
}

export function normalizeOrderStatus(status?: string | null): OrderStatus {
  const candidate = status ? STATUS_ALIASES[status] ?? status : 'created';
  return Object.prototype.hasOwnProperty.call(STATUS_TRANSITIONS, candidate)
    ? (candidate as OrderStatus)
    : 'created';
}
