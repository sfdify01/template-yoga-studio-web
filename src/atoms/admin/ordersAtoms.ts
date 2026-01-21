import { atom } from 'jotai';
import { loadable } from 'jotai/utils';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase/client';
import type { OrderDetails } from '../../lib/orders/types';
import {
  cancelOrder,
  fetchAdminOrders,
  markOrderPickedUp,
} from '../../lib/admin/orders-api';
import { hasAdminRole as hasAdminRoleFromUser } from '../../lib/auth/roles';

type AdminAuthState = {
  user: User | null;
  token: string | null;
  isAdmin: boolean;
};

export type OrdersFilter = {
  status: 'all' | string;
  fulfillment: 'all' | 'pickup' | 'delivery';
  search: string;
};

const hasAdminRole = (user: User | null): boolean => hasAdminRoleFromUser(user);

export const adminSessionAtom = atom<Promise<AdminAuthState>>(async () => {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const user = session?.user ?? null;
  const token = session?.access_token ?? null;

  return {
    user,
    token,
    isAdmin: hasAdminRole(user),
  };
});

export const adminOrdersAtom = atom<OrderDetails[]>([]);
export const adminOrdersLoadingAtom = atom<boolean>(false);
export const adminOrdersErrorAtom = atom<string | null>(null);
export const adminOrdersFilterAtom = atom<OrdersFilter>({
  status: 'all',
  fulfillment: 'all',
  search: '',
});

export const adminSessionLoadableAtom = loadable(adminSessionAtom);

export const adminVisibleOrdersAtom = atom<OrderDetails[]>((get) => {
  const orders = get(adminOrdersAtom);
  const filters = get(adminOrdersFilterAtom);
  const search = filters.search.trim().toLowerCase();

  return orders.filter((order) => {
    const matchesStatus =
      filters.status === 'all' || order.status === filters.status;
    const matchesFulfillment =
      filters.fulfillment === 'all' ||
      order.fulfillmentType === filters.fulfillment;

    const matchesSearch =
      !search ||
      order.shortCode.toLowerCase().includes(search) ||
      (order.contact.name ?? '').toLowerCase().includes(search) ||
      (order.contact.phone ?? '').toLowerCase().includes(search) ||
      (order.contact.email ?? '').toLowerCase().includes(search);

    return matchesStatus && matchesFulfillment && matchesSearch;
  });
});

export const refreshAdminOrdersAtom = atom(
  null,
  async (get, set) => {
    set(adminOrdersLoadingAtom, true);
    set(adminOrdersErrorAtom, null);

    try {
      const session = await get(adminSessionAtom);
      if (!session.isAdmin || !session.token) {
        throw new Error('Admin access required');
      }

      const filters = get(adminOrdersFilterAtom);
      const orders = await fetchAdminOrders(session.token, {
        status: filters.status === 'all' ? undefined : filters.status,
        fulfillment:
          filters.fulfillment === 'all' ? undefined : filters.fulfillment,
        limit: 100,
      });

      set(adminOrdersAtom, orders);
    } catch (error: any) {
      set(
        adminOrdersErrorAtom,
        error?.message || 'Failed to load orders'
      );
      set(adminOrdersAtom, []);
    } finally {
      set(adminOrdersLoadingAtom, false);
    }
  }
);

export const markOrderPickedUpAtom = atom(
  null,
  async (get, set, orderId: string) => {
    const session = await get(adminSessionAtom);
    if (!session.isAdmin || !session.token) {
      throw new Error('Admin access required');
    }

    const updated = await markOrderPickedUp(session.token, orderId);
    set(adminOrdersAtom, (prev) =>
      prev.map((order) => (order.id === updated.id ? updated : order))
    );
  }
);

export const cancelOrderAtom = atom(
  null,
  async (get, set, params: { orderId: string; reason?: string }) => {
    const session = await get(adminSessionAtom);
    if (!session.isAdmin || !session.token) {
      throw new Error('Admin access required');
    }

    const updated = await cancelOrder(session.token, params.orderId, params.reason);
    set(adminOrdersAtom, (prev) =>
      prev.map((order) => (order.id === updated.id ? updated : order))
    );
  }
);
