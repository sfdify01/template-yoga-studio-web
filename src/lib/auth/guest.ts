import type { OrderDetails, LoyaltySummary } from '../orders/types';
import type { User } from './types';

const STORAGE_KEY = 'tabsy-user';

export type GuestUserRecord = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  customerId?: string; // Links to customer record in database for order lookup
  loyaltyBalance: number;
  createdAt: string;
};

export function loadGuestUser(): GuestUserRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GuestUserRecord) : null;
  } catch (error) {
    console.error('Failed to load guest user profile', error);
    return null;
  }
}

export function saveGuestUser(record: GuestUserRecord) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (error) {
    console.error('Failed to persist guest user profile', error);
  }
}

export function clearGuestUser() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear guest user profile', error);
  }
}

export function buildGuestUserFromOrder(
  order: OrderDetails,
  loyalty?: LoyaltySummary | null
): GuestUserRecord {
  const contact = order.contact;
  const name = contact.name || 'Guest';
  const email = contact.email || undefined;
  const phone = contact.phone || undefined;
  const customerId = order.customerId || undefined;
  const identifier = email || phone || customerId || order.id;

  return {
    id: `guest-${identifier}`,
    name,
    email,
    phone,
    customerId,
    loyaltyBalance: loyalty?.newBalance ?? 0,
    createdAt: new Date().toISOString(),
  };
}

export function convertGuestRecordToUser(record: GuestUserRecord): User {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone,
    customerId: record.customerId,
    createdAt: record.createdAt,
  };
}
