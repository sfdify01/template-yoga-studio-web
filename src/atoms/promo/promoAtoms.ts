import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Types for promo validation
export type PromoInfo = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  maxDiscountCents: number | null;
};

export type PromoValidationState = {
  isValidating: boolean;
  error: string | null;
  validatedPromo: PromoInfo | null;
  discountCents: number;
};

// Storage keys
const PROMO_CODE_STORAGE_KEY = 'tabsy-promo-code';
const PROMO_INFO_STORAGE_KEY = 'tabsy-promo-info';
const PROMO_DISCOUNT_STORAGE_KEY = 'tabsy-promo-discount';

// Base state atoms
export const promoCodeAtom = atomWithStorage<string>(PROMO_CODE_STORAGE_KEY, '');
export const promoInfoAtom = atomWithStorage<PromoInfo | null>(PROMO_INFO_STORAGE_KEY, null);
export const promoDiscountCentsAtom = atomWithStorage<number>(PROMO_DISCOUNT_STORAGE_KEY, 0);
export const promoIsValidatingAtom = atom<boolean>(false);
export const promoErrorAtom = atom<string | null>(null);

// Combined validation state (derived atom for convenience)
export const promoValidationStateAtom = atom<PromoValidationState>((get) => ({
  isValidating: get(promoIsValidatingAtom),
  error: get(promoErrorAtom),
  validatedPromo: get(promoInfoAtom),
  discountCents: get(promoDiscountCentsAtom),
}));

// Validate promo action
export const validatePromoAtom = atom(
  null,
  async (
    get,
    set,
    params: {
      code: string;
      subtotalCents: number;
      customerEmail?: string;
      customerPhone?: string;
    }
  ) => {
    const { code, subtotalCents, customerEmail, customerPhone } = params;

    if (!code || code.trim().length === 0) {
      set(promoErrorAtom, 'Please enter a promo code');
      return { valid: false, error: 'Please enter a promo code' };
    }

    set(promoIsValidatingAtom, true);
    set(promoErrorAtom, null);

    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const response = await fetch(`${baseUrl}/functions/v1/market-server/promos/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          subtotalCents,
          customerEmail,
          customerPhone,
        }),
      });

      const result = await response.json();

      if (result.valid && result.promo) {
        set(promoCodeAtom, result.promo.code);
        set(promoInfoAtom, result.promo);
        set(promoDiscountCentsAtom, result.discountCents || 0);
        set(promoErrorAtom, null);
        return { valid: true, promo: result.promo, discountCents: result.discountCents };
      } else {
        set(promoErrorAtom, result.error || 'Invalid promo code');
        set(promoInfoAtom, null);
        set(promoDiscountCentsAtom, 0);
        return { valid: false, error: result.error || 'Invalid promo code' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate promo code';
      set(promoErrorAtom, errorMessage);
      set(promoInfoAtom, null);
      set(promoDiscountCentsAtom, 0);
      return { valid: false, error: errorMessage };
    } finally {
      set(promoIsValidatingAtom, false);
    }
  }
);

// Clear promo action
export const clearPromoAtom = atom(null, (_get, set) => {
  set(promoCodeAtom, '');
  set(promoInfoAtom, null);
  set(promoDiscountCentsAtom, 0);
  set(promoErrorAtom, null);
  set(promoIsValidatingAtom, false);
});

// Recalculate discount when subtotal changes (for real-time updates)
export const recalculatePromoDiscountAtom = atom(
  null,
  (get, set, subtotalCents: number) => {
    const promoInfo = get(promoInfoAtom);
    if (!promoInfo) {
      set(promoDiscountCentsAtom, 0);
      return;
    }

    let discountCents: number;
    if (promoInfo.discountType === 'percentage') {
      discountCents = Math.round(subtotalCents * (promoInfo.discountValue / 100));
    } else {
      discountCents = promoInfo.discountValue;
    }

    // Apply max discount cap
    if (promoInfo.maxDiscountCents !== null && discountCents > promoInfo.maxDiscountCents) {
      discountCents = promoInfo.maxDiscountCents;
    }

    // Ensure discount doesn't exceed subtotal
    if (discountCents > subtotalCents) {
      discountCents = subtotalCents;
    }

    set(promoDiscountCentsAtom, discountCents);
  }
);
