import type { User as SupabaseAuthUser } from '@supabase/supabase-js';

import { supabase } from '../supabase/client';
import { authStore } from './store';
import {
  AuthStartRequest,
  AuthStartResponse,
  AuthVerifyRequest,
  AuthVerifyResponse,
  User,
  MeResponse,
  AuthFlow,
} from './types';
import { fetchLoyaltyProfile } from '../loyalty/api';
import { getOrCreateProfile } from '../loyalty/client';
import { loyaltyStore } from '../loyalty/store';

const FLOW_DURATION_MS = 10 * 60 * 1000;

function mapSupabaseUser(authUser: SupabaseAuthUser): User {
  return {
    id: authUser.id,
    email: authUser.email ?? undefined,
    phone: authUser.phone ?? undefined,
    name:
      (authUser.user_metadata?.full_name as string | undefined) ??
      authUser.email?.split('@')[0] ??
      'Guest',
    createdAt: authUser.created_at ?? new Date().toISOString(),
  };
}

/**
 * Ensures the public.customers table is in sync with the auth user.
 * Handles specialized logic for claiming orphaned emails and stealing phone numbers.
 */
async function ensureSupabaseCustomer(user: User) {
  // 1. Handle Email Orphan Claiming (Safe)
  if (user.email) {
    try {
      await supabase.rpc('claim_orphan_email', { p_email: user.email });
    } catch (e) {
      console.warn('Failed to claim orphan email', e);
    }
  }

  // 2. Handle Phone Number Stealing (Latest Wins)
  if (user.phone) {
    try {
      await supabase.rpc('claim_phone_number', { p_phone: user.phone });
    } catch (e) {
      console.warn('Failed to claim phone', e);
    }
  }

  // 3. Proceed with standard Update/Upsert
  try {
    const nameParts = (user.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const { error } = await supabase
      .from('customers')
      .upsert(
        {
          auth_user_id: user.id,
          email: user.email,
          phone: user.phone,
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'auth_user_id',
          ignoreDuplicates: false,
        }
      );

    if (error) {
      console.warn('Failed to upsert customer record', error);
    }
  } catch (e) {
    console.warn('Error in ensureSupabaseCustomer', e);
  }
}

function assertActiveFlow(
  flowId: string,
  options: { allowExpired?: boolean } = {}
): { flow: AuthFlow; expired: boolean } {
  const flow = authStore.getFlow(flowId);
  if (!flow) {
    throw new Error('Invalid verification flow. Please start again.');
  }
  const expired = new Date(flow.expiresAt) < new Date();
  if (expired && !options.allowExpired) {
    throw new Error('Verification flow expired. Please start again.');
  }
  return { flow, expired };
}

export async function startAuth(data: AuthStartRequest): Promise<AuthStartResponse> {
  if (!data.email && !data.phone) {
    throw new Error('Email or phone is required');
  }

  const method = data.email ? 'email' : 'sms';
  const identifier = (data.email || data.phone || '').trim();
  let normalizedIdentifier = identifier;

  if (method === 'email') {
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedIdentifier,
      options: { shouldCreateUser: true },
    });
    if (error) {
      throw new Error(error.message || 'Unable to send verification code');
    }
  } else {
    const { toE164PhoneNumber } = await import('../utils/phone');
    const formattedPhone = toE164PhoneNumber(identifier);

    if (!formattedPhone) {
      throw new Error('Invalid phone number format');
    }

    normalizedIdentifier = formattedPhone;

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: { shouldCreateUser: true, channel: 'sms' },
    });
    if (error) {
      throw new Error(error.message || 'Unable to send verification code');
    }
  }

  const flow = authStore.createFlow(method, normalizedIdentifier);

  return {
    method,
    codeSent: true,
    flowId: flow.id,
  };
}

export async function verifyAuth(data: AuthVerifyRequest): Promise<AuthVerifyResponse> {
  const { flow } = assertActiveFlow(data.flowId);
  const isEmail = flow.method === 'email';
  let phone: string | null = null;

  if (!isEmail) {
    const { toE164PhoneNumber } = await import('../utils/phone');
    phone = toE164PhoneNumber(flow.identifier);

    if (!phone) {
      throw new Error('Invalid phone number. Please start again.');
    }
  }

  const verifyParams = isEmail
    ? {
      type: 'email' as const,
      email: flow.identifier,
      token: data.code,
    }
    : {
      type: 'sms' as const,
      phone: phone!,
      token: data.code,
    };

  const { data: verifyData, error } = await supabase.auth.verifyOtp(verifyParams);
  if (error || !verifyData?.session || !verifyData.user) {
    throw new Error(error?.message || 'Invalid or expired code');
  }

  const user = mapSupabaseUser(verifyData.user);
  authStore.upsertUser(user);

  // Sync to customers table
  await ensureSupabaseCustomer(user);

  try {
    getOrCreateProfile(user.email, user.phone, user.name);
  } catch (err) {
    console.warn('Unable to upsert loyalty profile for user', err);
  }

  authStore.deleteFlow(flow.id);

  return {
    success: true,
    token: verifyData.session.access_token,
    user,
  };
}

export async function getCurrentUser(): Promise<MeResponse | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Failed to load session', error);
    return null;
  }

  const session = data?.session;
  if (!session?.user) {
    return null;
  }

  const user = mapSupabaseUser(session.user);
  authStore.upsertUser(user);

  // Note: We intentionally don't await ensureSupabaseCustomer here to avoid blocking app load
  // But we want it to run to keep data in sync
  ensureSupabaseCustomer(user).catch(err => console.warn('Background sync failed', err));

  let loyaltyBalance = 0;
  try {
    const loyaltyResponse = await fetchLoyaltyProfile({
      email: user.email,
      phone: user.phone,
    });
    if (loyaltyResponse?.profile?.stars != null) {
      loyaltyBalance = loyaltyResponse.profile.stars;
    }
  } catch (err) {
    console.warn('Unable to load loyalty profile from Supabase', err);
    try {
      const loyaltyProfile =
        loyaltyStore.findProfileByEmailOrPhone(user.email, user.phone) ||
        getOrCreateProfile(user.email, user.phone, user.name);
      loyaltyBalance = loyaltyProfile?.stars || 0;
    } catch (fallbackErr) {
      console.warn('Fallback loyalty profile load failed', fallbackErr);
    }
  }

  return {
    user,
    loyaltyBalance,
  };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function resendCode(flowId: string): Promise<void> {
  const { flow } = assertActiveFlow(flowId, { allowExpired: true });
  const expiresAt = new Date(Date.now() + FLOW_DURATION_MS).toISOString();

  if (flow.method === 'email') {
    const { error } = await supabase.auth.signInWithOtp({
      email: flow.identifier,
      options: { shouldCreateUser: true },
    });
    if (error) {
      throw new Error(error.message || 'Failed to resend code');
    }
  } else {
    const { toE164PhoneNumber } = await import('../utils/phone');
    const formattedPhone = toE164PhoneNumber(flow.identifier);

    if (!formattedPhone) {
      throw new Error('Invalid phone number format. Please start again.');
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: { shouldCreateUser: true, channel: 'sms' },
    });
    if (error) {
      throw new Error(error.message || 'Failed to resend code');
    }

    authStore.updateFlow(flowId, {
      identifier: formattedPhone,
      expiresAt,
    });
    return;
  }

  authStore.updateFlow(flowId, {
    expiresAt,
  });
}

export async function updateUserProfile(updates: {
  name?: string;
  phone?: string;
}): Promise<User> {
  const { data: { user: authUser }, error } = await supabase.auth.updateUser({
    data: {
      full_name: updates.name,
    },
    phone: updates.phone,
  });

  if (error || !authUser) {
    throw new Error(error?.message || 'Failed to update profile');
  }

  const user = mapSupabaseUser(authUser);
  authStore.upsertUser(user);

  // Sync to customers table
  await ensureSupabaseCustomer(user);

  return user;
}
