import { useState, useEffect } from 'react';
import { X, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart, getTotalQty } from '../../lib/cart/useCart';
import { CartLineItem } from './CartLineItem';
import { CartSummary } from './CartSummary';
import { EmptyCartState } from './EmptyCartState';
import { TipSelector } from './TipSelector';
import { NextStepCards } from './NextStepCards';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';

interface CartDrawerProps {
  brandColor?: string;
  onNavigate: (path: string) => void;
}

export const CartDrawer = ({ brandColor = '#6B0F1A', onNavigate }: CartDrawerProps) => {
  const {
    items,
    totals,
    isOpen,
    closeDrawer,
    setQty,
    removeItem,
    tipPercentage,
    setTipPercentage,
    customTip,
    setCustomTip,
    couponCode,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set default tip to 10% on mount if not already set
  useEffect(() => {
    if (items.length > 0 && tipPercentage === 0 && customTip === 0) {
      setTipPercentage(10);
    }
  }, [items.length]);

  // Manage body scroll and cart-open state
  useEffect(() => {
    if (isOpen) {
      document.body.setAttribute('data-cart-open', 'true');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.removeAttribute('data-cart-open');
      document.body.style.overflow = '';
    }
    return () => {
      document.body.removeAttribute('data-cart-open');
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, closeDrawer]);

  const handleApplyCoupon = () => {
    if (couponInput.trim()) {
      applyCoupon(couponInput.trim());
    }
  };

  const handleTipSelect = (value: number) => {
    setTipPercentage(value);
    setCustomTip(0);
  };

  const handleContinue = (mode: 'pickup' | 'delivery') => {
    // TODO: Implement inline checkout flow
    console.log('Selected mode:', mode);
    closeDrawer();
  };

  const handleViewLocations = () => {
    closeDrawer();
    onNavigate('/contact');
  };

  const handleBrowseMenu = () => {
    closeDrawer();
    onNavigate('/products');
  };

  const totalQty = getTotalQty(items);
  const isEmpty = items.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/40"
            style={{ zIndex: 70 }}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`cart-drawer fixed bg-white shadow-xl flex flex-col ${
              isMobile
                ? 'bottom-0 left-0 right-0 rounded-t-3xl max-h-[88vh]'
                : 'top-0 right-0 bottom-0'
            }`}
            style={{
              zIndex: 80,
              width: isMobile ? '100vw' : 'var(--drawer-w)',
              maxWidth: isMobile ? '100vw' : '420px',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
          >
            {/* Drag handle for mobile */}
            {isMobile && (
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 id="cart-title" className="text-base sm:text-lg">
                  Your Order
                </h2>
                {!isEmpty && (
                  <p className="text-xs sm:text-sm text-gray-600">
                    {totalQty} {totalQty === 1 ? 'item' : 'items'}
                  </p>
                )}
              </div>
              <button
                onClick={closeDrawer}
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isEmpty ? (
              <EmptyCartState
                onBrowseMenu={handleBrowseMenu}
                onViewPopular={() => {
                  closeDrawer();
                  onNavigate('/products#featured');
                }}
                brandColor={brandColor}
              />
            ) : (
              <>
                {/* Items list */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-1">
                    {items.map((item) => (
                      <CartLineItem
                        key={item.id}
                        item={item}
                        onQtyChange={setQty}
                        onRemove={removeItem}
                      />
                    ))}
                  </div>

                  <Separator className="my-6" />

                  {/* Tip selector */}
                  <TipSelector
                    tipPercentage={tipPercentage}
                    onSelectTip={handleTipSelect}
                    brandColor={brandColor}
                  />

                  {/* Coupon code */}
                  <div className="mb-6">
                    <label className="text-sm mb-2 flex items-center gap-1">
                      <Percent className="w-4 h-4" />
                      Promo code
                    </label>
                    {!couponCode ? (
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="WELCOME10"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                          className="flex-1"
                        />
                        <Button onClick={handleApplyCoupon} variant="outline" size="sm">
                          Apply
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-sm text-green-700 font-medium">
                          {couponCode} applied
                        </span>
                        <button
                          onClick={removeCoupon}
                          className="text-sm text-green-700 underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {couponCode === 'WELCOME10' && (
                      <p className="text-xs text-green-600 mt-1">10% discount applied!</p>
                    )}
                  </div>

                  <Separator className="my-6" />

                  {/* Summary */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-3">Order Summary</h3>
                    <CartSummary totals={totals}>
                      Tax and fees calculated based on your location
                    </CartSummary>
                  </div>

                  <Separator className="my-6" />

                  {/* Next Step Cards */}
                  <NextStepCards
                    onNavigate={onNavigate}
                    brandColor={brandColor}
                  />
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
