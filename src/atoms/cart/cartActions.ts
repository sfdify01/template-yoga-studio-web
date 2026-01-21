import { atom } from 'jotai';
import {
  couponCodeAtom,
  tipPercentageAtom,
  customTipAtom,
} from './cartAtoms';

export const applyCouponAtom = atom(
  null,
  (_, set, code: string) => set(couponCodeAtom, code.trim().toUpperCase())
);

export const removeCouponAtom = atom(null, (_, set) => set(couponCodeAtom, ''));

export const setTipPercentageAtom = atom(
  null,
  (_, set, value: number) => set(tipPercentageAtom, Math.max(0, value))
);

export const setCustomTipAtom = atom(
  null,
  (_, set, amount: number) => set(customTipAtom, Math.max(0, amount))
);
