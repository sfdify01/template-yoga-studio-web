import { edgeFunctionBaseUrl } from '../supabase-edge';
import { publicAnonKey } from '../../utils/supabase/info';

export type LoyaltyProfileLookupResponse = {
  profile: {
    id: string;
    email?: string | null;
    phone?: string | null;
    name?: string | null;
    stars?: number | null;
    referralCode?: string | null;
    firstOrderCompleted?: boolean | null;
  } | null;
  events: Array<{
    id: string;
    created_at: string;
    stars: number;
    description?: string | null;
    type?: string | null;
  }>;
};

type Contact = { email?: string | null; phone?: string | null };

function normalizeContact(contact: Contact): Contact {
  const email = contact.email?.trim();
  const phone = contact.phone?.trim();
  return {
    email: email?.length ? email : undefined,
    phone: phone?.length ? phone : undefined,
  };
}

export async function fetchLoyaltyProfile(contact: Contact): Promise<LoyaltyProfileLookupResponse | null> {
  const normalized = normalizeContact(contact);
  if (!normalized.email && !normalized.phone) return null;

  const response = await fetch(`${edgeFunctionBaseUrl}/loyalty/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
      apikey: publicAnonKey,
    },
    body: JSON.stringify(normalized),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.error || `Failed to fetch loyalty profile (${response.status})`;
    throw new Error(message);
  }

  return data as LoyaltyProfileLookupResponse;
}
