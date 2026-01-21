/**
 * Cart Rail - Persistent right-side cart (desktop) / bottom sheet (mobile)
 * High-conversion, always visible, Stripe-ready
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, ChevronRight, X, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { CartLineItem } from './CartLineItem';
import { CartSummary } from './CartSummary';
import { TipSelector } from './TipSelector';
import { EmptyCartState } from './EmptyCartState';
import { AISuggestions } from '../ordering/AISuggestions';
import { useCart, formatPrice } from '../../lib/cart/useCart';
import { UniversalMenuItem } from '../../lib/menu/types';

interface CartRailProps {
  brandColor: string;
  allMenuItems?: UniversalMenuItem[];
  onCheckout: () => void;
  onItemEdit?: (itemId: string) => void;
  onItemClick?: (item: UniversalMenuItem) => void;
  isMobile?: boolean;
}

// Analytics
const trackEvent = (eventName: string, properties: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track(eventName, properties);
  }
  console.log(`[Analytics] ${eventName}`, properties);
};

export const CartRail = ({
  brandColor,
  allMenuItems = [],
  onCheckout,
  onItemEdit,
  onItemClick,
  isMobile = false,
}: CartRailProps) => {
  const { items, removeItem, setQty, totals, tipPercentage, setTipPercentage, customTip, setCustomTip } = useCart();
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  const isEmpty = items.length === 0;
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

  const handleApplyPromo = () => {
    // Mock promo validation
    if (promoCode.toUpperCase() === 'SAVE10') {
      setPromoApplied(true);
      setPromoError('');
    } else if (promoCode) {
      setPromoError('Invalid promo code');
      setPromoApplied(false);
    }
  };

  const handleCheckout = () => {
    trackEvent('cart_checkout_clicked', {
      total: totals.grand_total,
      fulfillment: 'pickup', // TODO: Get from context
      item_count: itemCount,
      tip_amount: totals.tips,
    });
    onCheckout();
  };

  // Desktop: Always visible rail
  if (!isMobile) {
    return (
      <div className="w-[400px] border-l border-gray-200 bg-white flex flex-col h-screen sticky top-0">
        {/* Header */}
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Your Cart</h2>
            {!isEmpty && (
              <Badge variant="secondary" className="h-6 px-2">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </Badge>
            )}
          </div>
        </div>

        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center p-5">
            <EmptyCartState 
              onBrowseMenu={() => window.location.href = '/products'}
              brandColor={brandColor}
            />
          </div>
        ) : (
          <>
            {/* Scrollable Items */}
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-4">
                {/* Items */}
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <CartLineItem
                      key={`${item.id}-${index}`}
                      item={item}
                      onRemove={(id) => removeItem(id)}
                      onQtyChange={(id, qty) => setQty(id, qty)}
                    />
                  ))}
                </div>

                {/* AI Suggestions */}
                {allMenuItems.length > 0 && (
                  <AISuggestions
                    cartItems={items}
                    allMenuItems={allMenuItems}
                    brandColor={brandColor}
                    onItemClick={onItemClick}
                    context="cart"
                  />
                )}

                {/* Tip Selector */}
                <div className="pt-4 border-t border-gray-200">
                  <TipSelector
                    tipPercentage={tipPercentage}
                    onSelectTip={setTipPercentage}
                    brandColor={brandColor}
                  />
                </div>

                {/* Promo Code */}
                <div className="space-y-2">
                  <label htmlFor="promo" className="text-sm font-medium text-gray-700">
                    Promo Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="promo"
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 h-10 px-3 border border-gray-300 rounded-lg text-sm"
                      disabled={promoApplied}
                    />
                    {!promoApplied ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleApplyPromo}
                        disabled={!promoCode}
                      >
                        Apply
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPromoApplied(false);
                          setPromoCode('');
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {promoError && (
                    <p className="text-xs text-red-600">{promoError}</p>
                  )}
                  {promoApplied && (
                    <p className="text-xs text-green-600">✓ Promo code applied</p>
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* Sticky Footer - Summary + Checkout */}
            <div className="border-t border-gray-200 p-5 space-y-4 bg-white">
              <CartSummary totals={totals} />

              <Button
                onClick={handleCheckout}
                className="w-full h-12 text-white font-semibold rounded-xl shadow-lg"
                style={{ background: brandColor }}
              >
                <Lock className="w-5 h-5 mr-2" />
                Checkout — {formatPrice(totals.grand_total)}
              </Button>

              <p className="text-xs text-center text-gray-500">
                Secure payment by Stripe • Apple Pay / Google Pay available
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  // Mobile: Bottom sheet with floating button
  return (
    <>
      {/* Floating Cart Button */}
      <AnimatePresence>
        {!isEmpty && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 z-40"
          >
            <Button
              onClick={() => {
                // Open sheet (handled by parent)
              }}
              className="w-full h-14 text-white font-semibold rounded-full shadow-2xl flex items-center justify-between px-6"
              style={{ background: brandColor }}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{formatPrice(totals.grand_total)}</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
