// Mock in-memory authentication store for UI helpers
// Supabase handles real auth; this cache is just for smart lookup UX

import { User, AuthFlow } from './types';

const STORAGE_KEY_USERS = 'tabsy_auth_users';
const STORAGE_KEY_FLOWS = 'tabsy_auth_flows';
const FLOW_TTL_MS = 10 * 60 * 1000; // 10 minutes

class AuthStore {
  private users: Map<string, User> = new Map();
  private flows: Map<string, AuthFlow> = new Map();
  private initialized = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    if (this.initialized || typeof window === 'undefined') return;

    try {
      const usersData = localStorage.getItem(STORAGE_KEY_USERS);
      const flowsData = localStorage.getItem(STORAGE_KEY_FLOWS);

      if (usersData) {
        const users = JSON.parse(usersData);
        this.users = new Map(Object.entries(users));
      }

      if (flowsData) {
        const flows = JSON.parse(flowsData);
        this.flows = new Map(Object.entries(flows));
      }

      this.initialized = true;
    } catch (error) {
      console.error('Error loading auth data from localStorage:', error);
    }
  }

  private saveToLocalStorage() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(
        STORAGE_KEY_USERS,
        JSON.stringify(Object.fromEntries(this.users))
      );
      localStorage.setItem(
        STORAGE_KEY_FLOWS,
        JSON.stringify(Object.fromEntries(this.flows))
      );
    } catch (error) {
      console.error('Error saving auth data to localStorage:', error);
    }
  }

  // User operations
  findUserByEmailOrPhone(email?: string, phone?: string): User | undefined {
    for (const user of this.users.values()) {
      if (email && user.email === email) return user;
      if (phone && user.phone === phone) return user;
    }
    return undefined;
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  createUser(data: Omit<User, 'id' | 'createdAt'>): User {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user: User = {
      id,
      createdAt: new Date().toISOString(),
      ...data,
    };

    this.users.set(id, user);
    this.saveToLocalStorage();
    return user;
  }

  upsertUser(user: User): void {
    this.users.set(user.id, user);
    this.saveToLocalStorage();
  }

  updateUser(userId: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updated = { ...user, ...updates };
    this.users.set(userId, updated);
    this.saveToLocalStorage();
    return updated;
  }

  // Auth flow operations
  createFlow(method: 'email' | 'sms', identifier: string): AuthFlow {
    const id = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + FLOW_TTL_MS).toISOString();

    const flow: AuthFlow = {
      id,
      method,
      identifier,
      expiresAt,
    };

    this.flows.set(id, flow);
    this.saveToLocalStorage();

    return flow;
  }

  getFlow(flowId: string): AuthFlow | undefined {
    return this.flows.get(flowId);
  }

  updateFlow(flowId: string, updates: Partial<AuthFlow>): AuthFlow | undefined {
    const flow = this.flows.get(flowId);
    if (!flow) return undefined;
    const updated = { ...flow, ...updates };
    this.flows.set(flowId, updated);
    this.saveToLocalStorage();
    return updated;
  }

  deleteFlow(flowId: string): void {
    this.flows.delete(flowId);
    this.saveToLocalStorage();
  }
}

// Singleton instance
export const authStore = new AuthStore();
