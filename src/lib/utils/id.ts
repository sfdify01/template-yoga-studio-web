/**
 * Generate unique IDs for orders
 * Using a simple implementation that doesn't require external dependencies
 */

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function nanoid(length: number = 10): string {
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return id;
}

/**
 * Generate a unique order ID
 * Format: ORD-XXXXXXXXXX (10 characters)
 */
export function generateOrderId(): string {
  return `ORD-${nanoid(10)}`;
}

/**
 * Generate a pickup code (last 4 characters of order ID)
 */
export function getPickupCode(orderId: string): string {
  return orderId.slice(-4);
}
