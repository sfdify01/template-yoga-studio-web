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
  return { token: session.access_token, user };
};

const buildHeaders = async (extra?: HeadersInit) => {
  const { token } = await assertAdminSession();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    apikey: publicAnonKey,
  };

  if (extra) {
    Object.entries(extra as Record<string, string>).forEach(([key, value]) => {
      headers[key] = value;
    });
  }

  return headers;
};

const adminRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers = await buildHeaders(init?.headers);

  const response = await fetch(`${BASE_URL}${path}`, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      data?.error || data?.message || data?.details || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return (data ?? {}) as T;
};

export const adminApi = {
  async login(password: string) {
    // Admin auth now relies on Supabase user sessions with the "admin" role.
    // Keep this stub for backward compatibility.
    throw new Error('Use Supabase login (OTP) with an account that has role "admin" in Supabase.');
  },

  async logout() {
    await supabase.auth.signOut();
    return { success: true };
  },

  async checkAuth() {
    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      return Boolean(user && hasAdminRoleFromUser(user));
    } catch {
      return false;
    }
  },

  async getPosts() {
    return adminRequest(`/admin/posts`);
  },

  async getPost(id: string) {
    return adminRequest(`/admin/posts/${id}`);
  },

  async createPost(post: any) {
    return adminRequest(`/admin/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    });
  },

  async updatePost(id: string, updates: any) {
    return adminRequest(`/admin/posts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  },

  async deletePost(id: string) {
    return adminRequest(`/admin/posts/${id}`, { method: 'DELETE' });
  },

  async uploadImage(file: File, slug: string) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('slug', slug);

    const headers = await buildHeaders();
    const response = await fetch(`${BASE_URL}/admin/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const message = data?.error || data?.message || 'Upload failed';
      throw new Error(message);
    }
    return data;
  },

  async deduplicateBlogs(dryRun: boolean = true) {
    return adminRequest(`/admin/dedupe-blogs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun }),
    });
  },

  async getDeduplicationLogs() {
    return adminRequest(`/admin/dedupe-logs`);
  },

  async getMenu() {
    return adminRequest(`/menu`);
  },

  async updateMenu(menuData: any) {
    return adminRequest(`/admin/menu`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(menuData),
    });
  },

  async uploadProductImage(file: File, itemId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', file.name);
    formData.append('itemId', itemId);

    const headers = await buildHeaders();
    const response = await fetch(`${BASE_URL}/admin/product/upload-image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const message = data?.error || data?.message || 'Upload failed';
      throw new Error(message);
    }

    return data;
  },
};
