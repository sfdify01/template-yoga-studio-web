import { supabaseUrl } from '../utils/supabase/info';

export const edgeFunctionSlug = 'market-server';
export const edgeFunctionBaseUrl = `${supabaseUrl}/functions/v1/${edgeFunctionSlug}`;

export function edgeFunctionUrl(path: string = ''): string {
  if (!path) return edgeFunctionBaseUrl;
  return `${edgeFunctionBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
