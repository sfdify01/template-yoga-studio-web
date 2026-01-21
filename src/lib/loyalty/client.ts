// Client-side loyalty helper functions

import { loyaltyStore } from './store';
import { LoyaltyProfile, EarnResponse, ReferralCreditResult } from './types';

// Constants
export const EARN_RATE = 10; // $1 = 10 stars
export const REFERRAL_INVITER_BONUS = 500;
export const REFERRAL_FRIEND_BONUS = 300;
export const MIN_ORDER_FOR_REFERRAL = 1000; // $10 minimum in cents

const REF_CODE_STORAGE_KEY = 'tabsy_ref_code';
const REF_CODE_COOKIE_DAYS = 7;

/**
 * Calculate stars earned from order amount
 * @param amountCents Order total in cents
 * @param earnPerDollar Earn rate (default 10 stars per dollar)
 * @returns Number of stars earned
 */
export function calcStars(amountCents: number, earnPerDollar: number = EARN_RATE): number {
  return Math.max(0, Math.round((amountCents / 100) * earnPerDollar));
}

/**
 * Get loyalty profile for current user
 * @returns Loyalty profile with stars balance or null if not logged in
 */
export async function getLoyaltyProfile(): Promise<{ stars: number } | null> {
  try {
    // Try getting from loyalty store first
    const profiles = Array.from(loyaltyStore['profiles'].values());
    if (profiles.length > 0) {
      // Get most recently updated profile (in a real app, this would be from /api/me or /api/loyalty/profile)
      const profile = profiles.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      return { stars: profile.stars };
    }
    return null;
  } catch (error) {
    console.error('Error fetching loyalty profile:', error);
    return null;
  }
}

/**
 * Build referral link for sharing
 * @param code Referral code
 * @returns Full URL with referral code
 */
export function buildReferralLink(code: string): string {
  if (typeof window === 'undefined') return '';
  const baseUrl = window.location.origin;
  return `${baseUrl}?ref=${code}&utm_source=tabsy_ref`;
}

/**
 * Remember referral attribution in localStorage
 * @param code Referral code
 */
export function rememberAttribution(code: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(REF_CODE_STORAGE_KEY, code);
    
    // Also set a cookie for 7 days
    const expires = new Date();
    expires.setDate(expires.getDate() + REF_CODE_COOKIE_DAYS);
    document.cookie = `${REF_CODE_STORAGE_KEY}=${code}; expires=${expires.toUTCString()}; path=/`;
  } catch (error) {
    console.error('Error storing referral code:', error);
  }
}

/**
 * Get stored referral attribution
 * @returns Referral code if present
 */
export function getStoredAttribution(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(REF_CODE_STORAGE_KEY);
  } catch (error) {
    console.error('Error reading referral code:', error);
    return null;
  }
}

/**
 * Clear referral attribution after first order
 */
export function clearAttribution(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(REF_CODE_STORAGE_KEY);
    document.cookie = `${REF_CODE_STORAGE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } catch (error) {
    console.error('Error clearing referral code:', error);
  }
}

/**
 * Get or create loyalty profile
 * @param email User email
 * @param phone User phone
 * @param name User name (optional)
 * @returns Loyalty profile
 */
export function getOrCreateProfile(
  email?: string,
  phone?: string,
  name?: string
): LoyaltyProfile {
  // Try to find existing profile
  let profile = loyaltyStore.findProfileByEmailOrPhone(email, phone);
  
  if (!profile && (email || phone)) {
    // Create new profile
    const refCode = getStoredAttribution();
    profile = loyaltyStore.createProfile({
      email,
      phone,
      name,
      referredBy: refCode || undefined,
    });
  }

  if (!profile) {
    throw new Error('Could not create profile without email or phone');
  }

  return profile;
}

/**
 * Award stars for an order
 * @param orderId Order ID
 * @param amountCents Order total in cents
 * @param email Customer email
 * @param phone Customer phone
 * @param name Customer name
 * @returns Earn response with new balance and referral credits if applicable
 */
export function earnStars(
  orderId: string,
  amountCents: number,
  email?: string,
  phone?: string,
  name?: string
): EarnResponse {
  // Get or create profile
  const profile = getOrCreateProfile(email, phone, name);
  
  // Calculate stars for this order
  const starsEarned = calcStars(amountCents);
  
  // Create earn event
  loyaltyStore.createEvent({
    profileId: profile.id,
    orderId,
    amountCents,
    stars: starsEarned,
    type: 'purchase',
    description: `Order #${orderId.slice(-6)}`,
  });

  // Update profile balance
  const newBalance = profile.stars + starsEarned;
  loyaltyStore.updateProfile(profile.email || profile.phone || profile.id, {
    stars: newBalance,
  });

  const response: EarnResponse = {
    starsEarned,
    newBalance,
  };

  // Check for referral credit (first order only)
  const refCode = profile.referredBy;
  if (refCode && !profile.firstOrderCompleted && amountCents >= MIN_ORDER_FOR_REFERRAL) {
    const referralCredit = creditReferral(refCode, profile, orderId);
    if (referralCredit) {
      response.referralCredited = referralCredit;
    }

    // Mark first order as completed
    loyaltyStore.updateProfile(profile.email || profile.phone || profile.id, {
      firstOrderCompleted: true,
    });

    // Clear attribution
    clearAttribution();
  } else if (!profile.firstOrderCompleted) {
    // Mark first order complete even without referral
    loyaltyStore.updateProfile(profile.email || profile.phone || profile.id, {
      firstOrderCompleted: true,
    });
  }

  return response;
}

/**
 * Credit referral bonuses to inviter and friend
 * @param code Referral code
 * @param friendProfile Friend's profile
 * @param orderId Order ID that triggered the credit
 * @returns Referral credit result
 */
function creditReferral(
  code: string,
  friendProfile: LoyaltyProfile,
  orderId: string
): ReferralCreditResult | null {
  const referral = loyaltyStore.getReferral(code);
  
  if (!referral || referral.firstOrderCredited) {
    return null;
  }

  // Get inviter profile
  const inviterProfile = loyaltyStore.getProfile(referral.inviterProfileId);
  if (!inviterProfile) {
    return null;
  }

  // Prevent self-referral
  if (inviterProfile.id === friendProfile.id) {
    return null;
  }

  // Credit inviter
  const inviterNewBalance = inviterProfile.stars + REFERRAL_INVITER_BONUS;
  loyaltyStore.updateProfile(referral.inviterProfileId, {
    stars: inviterNewBalance,
  });

  loyaltyStore.createEvent({
    profileId: inviterProfile.id,
    orderId,
    amountCents: 0,
    stars: REFERRAL_INVITER_BONUS,
    type: 'referral_inviter',
    description: 'Referral bonus (inviter)',
  });

  // Credit friend
  const friendNewBalance = friendProfile.stars + REFERRAL_FRIEND_BONUS;
  loyaltyStore.updateProfile(
    friendProfile.email || friendProfile.phone || friendProfile.id,
    { stars: friendNewBalance }
  );

  loyaltyStore.createEvent({
    profileId: friendProfile.id,
    orderId,
    amountCents: 0,
    stars: REFERRAL_FRIEND_BONUS,
    type: 'referral_friend',
    description: 'Referral bonus (friend)',
  });

  // Mark referral as credited
  loyaltyStore.creditReferral(code);

  return {
    inviterBonus: REFERRAL_INVITER_BONUS,
    friendBonus: REFERRAL_FRIEND_BONUS,
    inviterNewBalance,
    friendNewBalance,
  };
}

/**
 * Get or create referral link for a user
 * @param email User email
 * @param phone User phone
 * @returns Referral code
 */
export function getOrCreateReferralLink(email?: string, phone?: string): string {
  const profile = getOrCreateProfile(email, phone);
  
  // Check if user already has a referral code
  const existingReferrals = Array.from(loyaltyStore['referrals'].values());
  const existing = existingReferrals.find((r) => r.inviterProfileId === profile.id);
  
  if (existing) {
    return existing.code;
  }

  // Create new referral link
  const referral = loyaltyStore.createReferral(profile.id);
  return referral.code;
}

/**
 * Track referral link click
 * @param code Referral code
 */
export function trackReferralClick(code: string): void {
  loyaltyStore.incrementReferralClicks(code);
  rememberAttribution(code);
}

/**
 * Generate SMS share link
 * @param code Referral code
 * @param brandName Restaurant name
 * @returns SMS URL
 */
export function generateSMSShareLink(code: string, brandName: string): string {
  const link = buildReferralLink(code);
  const message = `I'm treating you! Use my link to order from ${brandName}. You'll get +${REFERRAL_FRIEND_BONUS} ⭐ on your first order: ${link}`;
  return `sms:?body=${encodeURIComponent(message)}`;
}

/**
 * Generate WhatsApp share link
 * @param code Referral code
 * @param brandName Restaurant name
 * @returns WhatsApp URL
 */
export function generateWhatsAppShareLink(code: string, brandName: string): string {
  const link = buildReferralLink(code);
  const message = `I'm treating you! Use my link to order from ${brandName}. You'll get +${REFERRAL_FRIEND_BONUS} ⭐ on your first order: ${link}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
