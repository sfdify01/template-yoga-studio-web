// Loyalty system type definitions

export interface LoyaltyProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  stars: number;
  referredBy?: string; // referral code that brought them here
  createdAt: string;
  firstOrderCompleted: boolean;
}

export interface EarnEvent {
  id: string;
  profileId: string;
  orderId: string;
  amountCents: number;
  stars: number;
  type: 'purchase' | 'referral_inviter' | 'referral_friend' | 'bonus';
  description: string;
  createdAt: string;
}

export interface ReferralLink {
  code: string;
  inviterProfileId: string;
  createdAt: string;
  clicks: number;
  conversions: number; // successful first orders
  firstOrderCredited: boolean;
}

export interface LoyaltyStats {
  totalMembers: number;
  starsIssued7d: number;
  referralConversions30d: number;
  activeMembers: number;
}

export interface ReferralCreditResult {
  inviterBonus: number;
  friendBonus: number;
  inviterNewBalance: number;
  friendNewBalance: number;
}

export interface EarnResponse {
  starsEarned: number;
  newBalance: number;
  referralCredited?: ReferralCreditResult;
}
