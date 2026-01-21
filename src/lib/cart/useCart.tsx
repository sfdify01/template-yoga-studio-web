import { useAtomValue, useSetAtom } from 'jotai';
import {
  CartItem,
  CartTotals,
  addCartItemAtom,
  cartDrawerAtom,
  cartItemsAtom,
  cartTotalsAtom,
  clearCartAtom,
  closeCartDrawerAtom,
  couponCodeAtom,
  customTipAtom,
  openCartDrawerAtom,
  removeCartItemAtom,
  setCartItemQtyAtom,
  tipPercentageAtom,
  updateCartItemNoteAtom,
  applyCouponAtom,
  removeCouponAtom,
  setTipPercentageAtom as setTipPercentageActionAtom,
  setCustomTipAtom as setCustomTipActionAtom,
} from '../../atoms/cart';
import { taxRateAtom } from '../../atoms/config/configAtoms';

type CartHook = {
  items: CartItem[];
  totals: CartTotals;
  isOpen: boolean;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateItemQty: (id: string, qty: number) => void;
  updateItemNote: (id: string, note: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  couponCode: string;
  applyCoupon: (code: string) => void;
  removeCoupon: () => void;
  tipPercentage: number;
  setTipPercentage: (percent: number) => void;
  customTip: number;
  setCustomTip: (amount: number) => void;
  taxRate: number;
};

export function useCart(): CartHook {
  const items = useAtomValue(cartItemsAtom);
  const totals = useAtomValue(cartTotalsAtom);
  const isOpen = useAtomValue(cartDrawerAtom);
  const couponCode = useAtomValue(couponCodeAtom);
  const tipPercentage = useAtomValue(tipPercentageAtom);
  const customTip = useAtomValue(customTipAtom);
  const taxRate = useAtomValue(taxRateAtom);

  const addItem = useSetAtom(addCartItemAtom);
  const removeItem = useSetAtom(removeCartItemAtom);
  const setQtyAtom = useSetAtom(setCartItemQtyAtom);
  const updateItemNote = useSetAtom(updateCartItemNoteAtom);
  const clear = useSetAtom(clearCartAtom);
  const openDrawer = useSetAtom(openCartDrawerAtom);
  const closeDrawer = useSetAtom(closeCartDrawerAtom);
  const applyCoupon = useSetAtom(applyCouponAtom);
  const removeCoupon = useSetAtom(removeCouponAtom);
  const setTipPercentage = useSetAtom(setTipPercentageActionAtom);
  const setCustomTip = useSetAtom(setCustomTipActionAtom);

  const updateItemQty = (id: string, qty: number) => setQtyAtom({ id, qty });

  return {
    items,
    totals,
    isOpen,
    addItem,
    removeItem,
    updateItemQty,
    updateItemNote,
    setQty: updateItemQty,
    clear,
    clearCart: clear,
    openDrawer,
    closeDrawer,
    couponCode,
    applyCoupon,
    removeCoupon,
    tipPercentage,
    setTipPercentage,
    customTip,
    setCustomTip,
    taxRate,
  };
}

// Format cents to currency
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Get total item count
export function getTotalQty(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}
