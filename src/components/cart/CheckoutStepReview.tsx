import React from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, ChevronRight, Minimize2 } from 'lucide-react';
import { useAtomValue } from 'jotai';
import { Button } from '../ui/button';
import { SmartCartLine } from './SmartCartLine';
import { AIMenuRecommendations } from './AIMenuRecommendations';
import { SmartTipSelector } from './SmartTipSelector';
import { FulfillmentSelector } from './FulfillmentSelector';
import { CartRewards } from './CartRewards';
import { PromoCodeInput } from '../checkout/PromoCodeInput';
import { useAuth } from '../../lib/auth/AuthContext';
import { MenuItem } from '../../hooks/useConfig';
import { ModernAddressPicker } from '../checkout/ModernAddressPicker';
import type { DeliveryAddressInput } from '../../lib/orders/types';
import { cartSubtotalAtom } from '../../atoms/cart/cartAtoms';
import { promoDiscountCentsAtom } from '../../atoms/promo/promoAtoms';

interface CheckoutStepReviewProps {
  items: any[];
  itemCount: number;
  subtotalCents: number;
  tip: { mode: 'percent' | 'amount'; value: number };
  deliveryType: 'pickup' | 'delivery';
  fulfillmentType?: 'pickup' | 'delivery' | null;
  totals: {
    subtotal: number;
    customItemsFee?: number;
    deliveryFee?: number;
    serviceFee: number;
    platformFee?: number;
    discount?: number;
    tax: number;
    tip: number;
    total: number;
    currency: string;
    courier?: string | null;
    stripeFeeEstimate?: number;
    deliveryFeePending?: boolean;
  };
  brandColor: string;
  loyaltyConfig?: {
    enabled: boolean;
    earnPerDollar: number;
    rewardThreshold: number;
    loyaltyHref: string;
  };
  menuItems?: MenuItem[];
  onUpdateQty: (id: string, qty: number) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onRecommendationAdd: (item: any) => void;
  onTipChange: (tip: { mode: 'percent' | 'amount'; value: number }) => void;
  onDeliveryTypeChange: (type: 'pickup' | 'delivery') => void;
  onContinue: () => void;
  onContinueBlocked?: () => void;
  continueDisabled?: boolean;
  showDeliveryError?: boolean;
  onClearCart: () => void;
  onNavigate?: (path: string) => void;
  onMinimize?: () => void; // Optional minimize handler for desktop
  deliveryAddress?: DeliveryAddressInput;
  onAddressSelect?: (address: any) => void;
  taxRate?: number;
  serviceFeeRate?: number;
}

export const CheckoutStepReview = ({
  items,
  itemCount,
  subtotalCents,
  tip,
  deliveryType,
  fulfillmentType,
  totals,
  brandColor,
  loyaltyConfig,
  menuItems = [],
  onUpdateQty,
  onUpdateNotes,
  onRemove,
  onEdit,
  onRecommendationAdd,
  onTipChange,
  onDeliveryTypeChange,
  onContinue,
  onContinueBlocked,
  continueDisabled = false,
  showDeliveryError = false,
  onClearCart,
  onNavigate,
  onMinimize,
  deliveryAddress,
  onAddressSelect,
  taxRate = 0,
  serviceFeeRate = 0,
}: CheckoutStepReviewProps) => {
  const { user, loyaltyBalance } = useAuth();

  // Get original subtotal (before discount) and promo discount
  const originalSubtotal = useAtomValue(cartSubtotalAtom);
  const promoDiscount = useAtomValue(promoDiscountCentsAtom);

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex flex-col h-full"
    >
      {/* Header - Fixed. Extra right padding on mobile for close button */}
      <header className="flex-shrink-0 bg-white border-b h-14 flex items-center justify-between px-4 pr-14 lg:pr-4">
        <div className="flex items-center gap-2">
          {onMinimize && (
            <motion.button
              onClick={onMinimize}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden lg:flex h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200 items-center justify-center transition-all hover:shadow-md group"
              aria-label="Minimize cart"
              title="Minimize cart"
            >
              <Minimize2 className="w-4 h-4 text-gray-600 group-hover:text-gray-800 transition-colors" />
            </motion.button>
          )}
          <h3 className="font-semibold text-gray-900">
            Your Cart {itemCount > 0 && <span className="text-gray-500 font-normal">({itemCount})</span>}
          </h3>
        </div>
        {items.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear
          </button>
        )}
      </header>

      {/* Progress Indicator */}
      <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Step 1 of 3</span>
          <div className="flex gap-1.5">
            <div className="w-8 h-1 rounded-full" style={{ backgroundColor: brandColor }} />
            <div className="w-8 h-1 rounded-full bg-gray-200" />
            <div className="w-8 h-1 rounded-full bg-gray-200" />
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: `${brandColor}20` }}
            >
              <ShoppingCart className="w-8 h-8" style={{ color: brandColor }} />
            </div>
            <h3 className="font-medium mb-2">Your cart is empty</h3>
            <p className="text-sm text-gray-500 mb-4">
              Add items from the menu to get started
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
            <div className="space-y-4">
              {/* Cart Lines */}
              <div className="space-y-3">
                {items.map((item) => (
                  <SmartCartLine
                    key={item.id}
                    id={item.id}
                    itemId={item.sku}
                    name={item.name}
                    thumbnail={item.image || 'https://source.unsplash.com/200x200/?food'}
                    qty={item.qty}
                    unitPrice={item.price}
                    lineTotal={item.price * item.qty}
                    priceUnit={item.priceUnit}
                    unitLabel={item.unitLabel}
                    notes={item.note}
                    brandColor={brandColor}
                    onUpdateQty={onUpdateQty}
                    onUpdateNotes={onUpdateNotes}
                    onRemove={onRemove}
                    onEdit={onEdit}
                  />
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* AI Recommendations */}
              <AIMenuRecommendations
                cartItems={items.map(item => ({ itemId: item.sku, qty: item.qty }))}
                menuItems={menuItems}
                brandColor={brandColor}
                onAdd={onRecommendationAdd}
              />

              {/* Fulfillment Selector */}
              <div>
                <h4 className="text-sm font-medium mb-3">Fulfillment Method</h4>
                <FulfillmentSelector
                  selected={fulfillmentType ?? null}
                  onChange={onDeliveryTypeChange}
                  brandColor={brandColor}
                />

                {deliveryType === 'delivery' && onAddressSelect && (
                  <div className="mt-4">
                    <ModernAddressPicker
                      onAddressSelect={onAddressSelect}
                      initialAddress={deliveryAddress}
                      brandColor={brandColor}
                      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                    />
                  </div>
                )}
              </div>

              {/* Tip Selector */}
              <div>
                <SmartTipSelector
                  subtotal={subtotalCents / 100}
                  currentTip={tip}
                  presets={[10, 15, 20]}
                  brandColor={brandColor}
                  onChange={onTipChange}
                  fulfillmentType={deliveryType}
                />
                <p className="text-xs text-gray-600 mt-2">
                  {deliveryType === 'delivery'
                    ? '100% of your tip goes directly to your Uber Direct courier.'
                    : 'Tips are optional for pickup orders.'}
                </p>
              </div>

              {/* Promo Code */}
              <PromoCodeInput brandColor={brandColor} />

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                {/* Show original subtotal when promo is applied */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className={promoDiscount > 0 ? "font-medium text-gray-400 line-through" : "font-medium"}>
                    {formatCurrency(originalSubtotal)}
                  </span>
                </div>

                {/* Show promo discount prominently when applied */}
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-sm" style={{ color: brandColor }}>
                    <span className="font-medium">Promo Discount</span>
                    <span className="font-semibold">-{formatCurrency(promoDiscount)}</span>
                  </div>
                )}

                {/* Show discounted subtotal when promo is applied */}
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal after discount</span>
                    <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                  </div>
                )}

                {totals.deliveryFee && totals.deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    {totals.deliveryFeePending ? (
                      <span className="flex items-center gap-2 text-gray-500">
                        <span className="h-4 w-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" aria-label="Calculating delivery fee" />
                        Calculating…
                      </span>
                    ) : (
                      <span className="font-medium">{formatCurrency(totals.deliveryFee)}</span>
                    )}
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Application fee
                    {serviceFeeRate > 0 && (
                      <span className="text-gray-500 ml-1">
                        ({(serviceFeeRate * 100).toFixed(1)}%)
                      </span>
                    )}
                  </span>
                  <span className="font-medium">{formatCurrency(totals.serviceFee)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Tax
                    {taxRate > 0 && (
                      <span className="text-gray-500 ml-1">
                        ({(taxRate * 100).toFixed(2)}%)
                      </span>
                    )}
                  </span>
                  <span className="font-medium">{formatCurrency(totals.tax)}</span>
                </div>

                {totals.tip > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tip</span>
                    <span className="font-medium">{formatCurrency(totals.tip)}</span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    {totals.deliveryFeePending ? (
                      <span className="flex items-center gap-2 text-gray-500">
                        <span className="h-4 w-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" aria-label="Calculating total" />
                        Calculating…
                      </span>
                    ) : (
                      <span className="font-bold text-lg" style={{ color: brandColor }}>
                        {formatCurrency(totals.total)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rewards Panel */}
              {loyaltyConfig?.enabled && (
                <CartRewards
                  subtotalCents={totals.subtotal}
                  earnPerDollar={loyaltyConfig.earnPerDollar}
                  rewardThreshold={loyaltyConfig.rewardThreshold}
                  loyaltyHref={loyaltyConfig.loyaltyHref}
                  isLoggedIn={!!user}
                  currentStars={loyaltyBalance}
                  brandColor={brandColor}
                  onNavigate={onNavigate}
                />
              )}
            </div>
          </div>

          {/* Footer - Fixed */}
          <footer className="flex-shrink-0 bg-white border-t p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
            <Button
              size="lg"
              className="w-full text-white hover:opacity-90"
              style={{ backgroundColor: brandColor }}
              onClick={() => {
                if (continueDisabled) {
                  onContinueBlocked?.();
                  return;
                }
                onContinue();
              }}
              disabled={continueDisabled}
            >
              Continue to Checkout
            </Button>
            {fulfillmentType === null && (
              <p className="text-xs text-red-600 text-center mt-2 font-medium">
                ⚠️ Please select Pickup or Delivery to continue
              </p>
            )}
            {showDeliveryError && (
              <p className="text-xs text-red-600 text-center mt-2">
                We couldn&apos;t calculate delivery for this address. Please update the address or contact us.
              </p>
            )}
          </footer>
        </>
      )}
    </motion.div>
  );
};
