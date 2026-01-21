// Simple in-memory database for demo
// In production, replace with PostgreSQL, MongoDB, or similar

import { OrderRecord, OrderStatus } from './types';

// In-memory store
const orders = new Map<string, OrderRecord>();
const ordersByCustomer = new Map<string, string[]>();

export async function createOrder(order: OrderRecord): Promise<OrderRecord> {
  orders.set(order.id, order);
  
  // Index by customer phone
  const customerOrders = ordersByCustomer.get(order.customer.phone) || [];
  customerOrders.push(order.id);
  ordersByCustomer.set(order.customer.phone, customerOrders);
  
  autoPersist();
  return order;
}

export async function getOrder(id: string): Promise<OrderRecord | null> {
  return orders.get(id) || null;
}

export async function updateOrder(
  id: string,
  updates: Partial<OrderRecord>
): Promise<OrderRecord | null> {
  const order = orders.get(id);
  if (!order) return null;
  
  const updated = { ...order, ...updates };
  orders.set(id, updated);
  autoPersist();
  return updated;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  timestamp?: string
): Promise<OrderRecord | null> {
  const order = orders.get(id);
  if (!order) return null;
  
  const updated = {
    ...order,
    status,
    timestamps: {
      ...order.timestamps,
      [status]: timestamp || new Date().toISOString(),
    },
  };
  
  orders.set(id, updated);
  autoPersist();
  return updated;
}

export async function getOrdersByCustomer(phone: string): Promise<OrderRecord[]> {
  const orderIds = ordersByCustomer.get(phone) || [];
  return orderIds
    .map(id => orders.get(id))
    .filter((o): o is OrderRecord => o !== undefined);
}

export async function getAllOrders(): Promise<OrderRecord[]> {
  return Array.from(orders.values());
}

// Generate unique order ID
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

// For persistence (optional - use localStorage in browser)
export function persistToStorage(): void {
  try {
    const data = {
      orders: Array.from(orders.entries()),
      ordersByCustomer: Array.from(ordersByCustomer.entries()),
    };
    localStorage.setItem('tabsy_orders', JSON.stringify(data));
  } catch (error) {
    console.error('Failed to persist orders to localStorage:', error);
  }
}

export function loadFromStorage(): void {
  try {
    const stored = localStorage.getItem('tabsy_orders');
    if (stored) {
      const data = JSON.parse(stored);
      
      // Restore maps
      if (data.orders) {
        for (const [id, order] of data.orders) {
          orders.set(id, order);
        }
      }
      if (data.ordersByCustomer) {
        for (const [phone, orderIds] of data.ordersByCustomer) {
          ordersByCustomer.set(phone, orderIds);
        }
      }
    }
  } catch (error) {
    console.error('Failed to load orders from localStorage:', error);
  }
}

// Auto-persist on changes
function autoPersist(): void {
  if (typeof window !== 'undefined') {
    setTimeout(() => persistToStorage(), 100);
  }
}
