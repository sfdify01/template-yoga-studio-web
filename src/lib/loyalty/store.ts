// Mock in-memory storage for loyalty system
// In production, this would be replaced with real database calls

import { LoyaltyProfile, EarnEvent, ReferralLink, LoyaltyStats } from './types';

const STORAGE_KEY_PROFILES = 'tabsy_loyalty_profiles';
const STORAGE_KEY_EVENTS = 'tabsy_loyalty_events';
const STORAGE_KEY_REFERRALS = 'tabsy_loyalty_referrals';

// In-memory store (resets on page reload unless persisted to localStorage)
class LoyaltyStore {
  private profiles: Map<string, LoyaltyProfile> = new Map();
  private events: Map<string, EarnEvent> = new Map();
  private referrals: Map<string, ReferralLink> = new Map();
  private initialized = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    if (this.initialized || typeof window === 'undefined') return;
    
    try {
      const profilesData = localStorage.getItem(STORAGE_KEY_PROFILES);
      const eventsData = localStorage.getItem(STORAGE_KEY_EVENTS);
      const referralsData = localStorage.getItem(STORAGE_KEY_REFERRALS);

      if (profilesData) {
        const profiles = JSON.parse(profilesData);
        this.profiles = new Map(Object.entries(profiles));
      }

      if (eventsData) {
        const events = JSON.parse(eventsData);
        this.events = new Map(Object.entries(events));
      }

      if (referralsData) {
        const referrals = JSON.parse(referralsData);
        this.referrals = new Map(Object.entries(referrals));
      }

      this.initialized = true;
    } catch (error) {
      console.error('Error loading loyalty data from localStorage:', error);
    }
  }

  private saveToLocalStorage() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(
        STORAGE_KEY_PROFILES,
        JSON.stringify(Object.fromEntries(this.profiles))
      );
      localStorage.setItem(
        STORAGE_KEY_EVENTS,
        JSON.stringify(Object.fromEntries(this.events))
      );
      localStorage.setItem(
        STORAGE_KEY_REFERRALS,
        JSON.stringify(Object.fromEntries(this.referrals))
      );
    } catch (error) {
      console.error('Error saving loyalty data to localStorage:', error);
    }
  }

  // Profile operations
  getProfile(key: string): LoyaltyProfile | undefined {
    return this.profiles.get(key);
  }

  findProfileByEmailOrPhone(email?: string, phone?: string): LoyaltyProfile | undefined {
    for (const profile of this.profiles.values()) {
      if (email && profile.email === email) return profile;
      if (phone && profile.phone === phone) return profile;
    }
    return undefined;
  }

  createProfile(data: Omit<LoyaltyProfile, 'id' | 'stars' | 'createdAt' | 'firstOrderCompleted'>): LoyaltyProfile {
    const id = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const profile: LoyaltyProfile = {
      id,
      stars: 0,
      createdAt: new Date().toISOString(),
      firstOrderCompleted: false,
      ...data,
    };

    const key = data.email || data.phone || id;
    this.profiles.set(key, profile);
    this.saveToLocalStorage();
    return profile;
  }

  updateProfile(key: string, updates: Partial<LoyaltyProfile>): LoyaltyProfile {
    const profile = this.profiles.get(key);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const updated = { ...profile, ...updates };
    this.profiles.set(key, updated);
    this.saveToLocalStorage();
    return updated;
  }

  // Event operations
  createEvent(event: Omit<EarnEvent, 'id' | 'createdAt'>): EarnEvent {
    const id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newEvent: EarnEvent = {
      id,
      createdAt: new Date().toISOString(),
      ...event,
    };

    this.events.set(id, newEvent);
    this.saveToLocalStorage();
    return newEvent;
  }

  getEventsByProfile(profileId: string): EarnEvent[] {
    return Array.from(this.events.values())
      .filter((e) => e.profileId === profileId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Referral operations
  createReferral(inviterProfileId: string): ReferralLink {
    const code = `REF${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    const referral: ReferralLink = {
      code,
      inviterProfileId,
      createdAt: new Date().toISOString(),
      clicks: 0,
      conversions: 0,
      firstOrderCredited: false,
    };

    this.referrals.set(code, referral);
    this.saveToLocalStorage();
    return referral;
  }

  getReferral(code: string): ReferralLink | undefined {
    return this.referrals.get(code);
  }

  incrementReferralClicks(code: string): void {
    const referral = this.referrals.get(code);
    if (referral) {
      referral.clicks += 1;
      this.referrals.set(code, referral);
      this.saveToLocalStorage();
    }
  }

  creditReferral(code: string): void {
    const referral = this.referrals.get(code);
    if (referral) {
      referral.conversions += 1;
      referral.firstOrderCredited = true;
      this.referrals.set(code, referral);
      this.saveToLocalStorage();
    }
  }

  // Stats operations
  getStats(): LoyaltyStats {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const starsIssued7d = Array.from(this.events.values())
      .filter((e) => new Date(e.createdAt).getTime() > sevenDaysAgo)
      .reduce((sum, e) => sum + e.stars, 0);

    const referralConversions30d = Array.from(this.referrals.values())
      .filter((r) => new Date(r.createdAt).getTime() > thirtyDaysAgo)
      .reduce((sum, r) => sum + r.conversions, 0);

    return {
      totalMembers: this.profiles.size,
      starsIssued7d,
      referralConversions30d,
      activeMembers: Array.from(this.profiles.values()).filter((p) => p.stars > 0).length,
    };
  }

  getAllProfiles(): LoyaltyProfile[] {
    return Array.from(this.profiles.values()).sort((a, b) => b.stars - a.stars);
  }
}

// Singleton instance
export const loyaltyStore = new LoyaltyStore();
