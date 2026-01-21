import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag, Loader2, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FulfillmentSelector } from './FulfillmentSelector';

interface OrderTotals {
  subtotal: number;
  customItemsFee?: number;
  deliveryFee?: number;
  serviceFee?: number;
  discount?: number;
  tax: number;
  tip: number;
  total: number;
  currency: string;
  savings?: number;
}

interface OrderSummaryBoxProps {
  totals: OrderTotals;
  deliveryType: 'delivery' | 'pickup';
  brandColor: string;
  onApplyPromo?: (code: string) => Promise<void>;
  onCheckout: () => void;
  onDeliveryTypeChange?: (type: 'delivery' | 'pickup') => void;
  serviceFeePercent?: number;
}

export const OrderSummaryBox = ({
  totals,
  deliveryType,
  brandColor,
  onApplyPromo,
  onCheckout,
  onDeliveryTypeChange,
  serviceFeePercent = 1,
}: OrderSummaryBoxProps) => {
  const [promoCode, setPromoCode] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);

  const handleApplyPromo = async () => {
    if (!promoCode.trim() || !onApplyPromo) return;
    
    setApplyingPromo(true);
    try {
      await onApplyPromo(promoCode.trim());
    } catch (error) {
      console.error('Failed to apply promo:', error);
    } finally {
      setApplyingPromo(false);
    }
  };

  const formatMoney = (cents: number) => {
    return `${totals.currency === 'USD' ? '$' : ''}${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-4" role="region" aria-label="Order summary" aria-live="polite">
      {/* Fulfillment Selector */}
      {onDeliveryTypeChange && (
        <FulfillmentSelector
          selected={deliveryType}
          onChange={onDeliveryTypeChange}
          brandColor={brandColor}
        />
      )}

      {/* Promo Code */}
      {onApplyPromo && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="h-9 text-sm rounded-lg"
                paddingLeft={44}
              />
            </div>
            <Button
              onClick={handleApplyPromo}
              disabled={!promoCode.trim() || applyingPromo}
              variant="outline"
              size="sm"
              className="h-9 rounded-lg"
            >
              {applyingPromo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Apply'
              )}
            </Button>
          </div>
          {totals.savings && totals.savings > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-green-600 flex items-center gap-1"
            >
              <Tag className="w-3 h-3" />
              You're saving {formatMoney(totals.savings)}!
            </motion.div>
          )}
        </div>
      )}

      {/* Summary Lines */}
      <div className="space-y-1.5">
        {/* Subtotal */}
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-800">{formatMoney(totals.subtotal)}</span>
        </div>

        {/* Custom Items Fee */}
        {totals.customItemsFee && totals.customItemsFee > 0 && (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-gray-600">Custom items surcharge</span>
            <span className="text-gray-800">{formatMoney(totals.customItemsFee)}</span>
          </div>
        )}

        {/* Delivery Fee - only show when delivery is selected */}
        {deliveryType === 'delivery' && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between text-[13px]"
          >
            <span className="text-gray-600">Delivery Fee</span>
            <span className="text-gray-800">
              {totals.deliveryFee && totals.deliveryFee > 0
                ? formatMoney(totals.deliveryFee)
                : <span className="text-green-600 text-xs font-medium">FREE</span>}
            </span>
          </motion.div>
        )}

        {/* Platform Fee */}
        {totals.serviceFee && totals.serviceFee > 0 && (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-gray-600">Platform fee</span>
            <span className="text-gray-800">{formatMoney(totals.serviceFee)}</span>
          </div>
        )}

        {/* Discount */}
        {totals.discount && totals.discount > 0 && (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-green-600">Discount</span>
            <span className="text-green-600">-{formatMoney(totals.discount)}</span>
          </div>
        )}

        {/* Tax */}
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-gray-600">Tax</span>
          <span className="text-gray-800">{formatMoney(totals.tax)}</span>
        </div>

        {/* Tip */}
        {totals.tip > 0 && (
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-gray-600">Tip</span>
            <span className="text-gray-800">{formatMoney(totals.tip)}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Total */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800">Total</span>
        <motion.div
          key={totals.total}
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          className="font-bold text-[18px]"
          style={{ color: brandColor }}
        >
          {formatMoney(totals.total)}
        </motion.div>
      </div>

      {/* Checkout Button */}
      <Button
        onClick={onCheckout}
        className="w-full h-12 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
        style={{ backgroundColor: brandColor }}
      >
        Checkout
      </Button>


      {/* Free Delivery Notice */}
      {deliveryType === 'delivery' && totals.deliveryFee && totals.deliveryFee > 0 && (
        <div className="text-xs text-gray-500 text-center pt-1">
          💡 FREE delivery on orders over $50
        </div>
      )}
    </div>
  );
};
