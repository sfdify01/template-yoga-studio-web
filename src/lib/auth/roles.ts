import type { User as SupabaseUser } from '@supabase/supabase-js';

// Normalize roles from app_metadata or user_metadata (string or array)
const extractRoles = (user: SupabaseUser | null | undefined): string[] => {
  if (!user) return [];
  const appRoles = (user.app_metadata as any)?.roles ?? (user.app_metadata as any)?.role;
  const userRoles = (user.user_metadata as any)?.roles ?? (user.user_metadata as any)?.role;
  return [
    ...(Array.isArray(appRoles) ? appRoles : appRoles ? [appRoles] : []),
    ...(Array.isArray(userRoles) ? userRoles : userRoles ? [userRoles] : []),
  ]
    .flat()
    .filter(Boolean)
    .map((role) => (typeof role === 'string' ? role.toLowerCase() : ''));
};

export const hasAdminRole = (user: SupabaseUser | null | undefined): boolean => {
  return extractRoles(user).includes('admin');
};
