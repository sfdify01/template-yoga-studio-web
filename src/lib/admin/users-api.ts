import { publicAnonKey } from '../../utils/supabase/info';
import { edgeFunctionBaseUrl } from '../supabase-edge';
import { supabase } from '../supabase/client';
import { hasAdminRole as hasAdminRoleFromUser } from '../auth/roles';

const BASE_URL = edgeFunctionBaseUrl;

const assertAdminSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message || 'Unable to load session');
  }
  const session = data.session;
  const user = session?.user ?? null;
  if (!session || !user) {
    throw new Error('Sign in required');
  }
  if (!hasAdminRoleFromUser(user)) {
    throw new Error('Admin role required');
  }
  return { token: session.access_token };
};

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { token } = await assertAdminSession();
  const response = await fetch(`${BASE_URL}${path}`, {
    method: init?.method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: publicAnonKey,
      ...(init?.headers || {}),
    },
    body: init?.body,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.error || data?.message || data?.details || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return (data ?? {}) as T;
}

export async function assignRole(params: { email: string; role: string; action?: 'add' | 'remove' }) {
  return adminRequest<{ success: boolean; roles: string[] }>('/admin/users/assign-role', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function resetUserPassword(params: { email: string; password: string }) {
  return adminRequest<{ success: boolean }>('/admin/users/reset-password', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
