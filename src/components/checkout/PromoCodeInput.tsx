import { useState, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket, X, Loader2, BadgePercent, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  promoInfoAtom,
  promoDiscountCentsAtom,
  promoIsValidatingAtom,
  promoErrorAtom,
  validatePromoAtom,
  clearPromoAtom,
  recalculatePromoDiscountAtom,
} from '@/atoms/promo/promoAtoms';
import { cartSubtotalAtom, guestEmailAtom, guestPhoneAtom } from '@/atoms/cart/cartAtoms';
import { cn } from '@/components/ui/utils';

interface PromoCodeInputProps {
  brandColor?: string;
}

export function PromoCodeInput({ brandColor = '#6B0F1A' }: PromoCodeInputProps) {
  const [inputCode, setInputCode] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [appliedPromo] = useAtom(promoInfoAtom);
  const discountCents = useAtomValue(promoDiscountCentsAtom);
  const isValidating = useAtomValue(promoIsValidatingAtom);
  const error = useAtomValue(promoErrorAtom);
  const subtotalCents = useAtomValue(cartSubtotalAtom);
  const guestEmail = useAtomValue(guestEmailAtom);
  const guestPhone = useAtomValue(guestPhoneAtom);
  const validatePromo = useSetAtom(validatePromoAtom);
  const clearPromo = useSetAtom(clearPromoAtom);
  const recalculateDiscount = useSetAtom(recalculatePromoDiscountAtom);

  // Recalculate discount when subtotal changes
  useEffect(() => {
    if (appliedPromo) {
      recalculateDiscount(subtotalCents);
    }
  }, [subtotalCents, appliedPromo, recalculateDiscount]);

  const handleApply = async () => {
    if (!inputCode.trim()) return;

    await validatePromo({
      code: inputCode.trim(),
      subtotalCents,
      customerEmail: guestEmail || undefined,
      customerPhone: guestPhone || undefined,
    });
  };

  const handleRemove = () => {
    clearPromo();
    setInputCode('');
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  // Show applied promo state - clean and minimal
  if (appliedPromo) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="rounded-xl border-2 p-3 bg-white"
        style={{ borderColor: brandColor }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Success icon */}
            <div
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${brandColor}15` }}
            >
              <CheckCircle
                className="w-5 h-5"
                style={{ color: brandColor }}
                strokeWidth={2.5}
              />
            </div>

            {/* Promo details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="font-bold text-xs tracking-wider px-2 py-1 rounded-md uppercase"
                  style={{
                    backgroundColor: brandColor,
                    color: 'white'
                  }}
                >
                  {appliedPromo.code}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: brandColor }}
                >
                  {appliedPromo.discountType === 'percentage'
                    ? `${appliedPromo.discountValue}% OFF`
                    : `$${(appliedPromo.discountValue / 100).toFixed(2)} OFF`
                  }
                </span>
              </div>

              {discountCents > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="text-sm mt-1 text-gray-600"
                >
                  Saving{' '}
                  <span className="font-semibold" style={{ color: brandColor }}>
                    ${(discountCents / 100).toFixed(2)}
                  </span>
                  {appliedPromo.maxDiscountCents && discountCents >= appliedPromo.maxDiscountCents && (
                    <span className="text-gray-400 text-xs ml-1">(max)</span>
                  )}
                </motion.p>
              )}
            </div>
          </div>

          {/* Remove button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="flex-shrink-0 h-8 w-8 p-0 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  // Collapsed state - button to expand
  if (!isExpanded) {
    return (
      <motion.button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed transition-all duration-200 hover:border-solid group bg-white"
        style={{
          borderColor: `${brandColor}30`,
          color: brandColor
        }}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        <BadgePercent className="w-4 h-4 transition-transform group-hover:scale-110" />
        <span className="text-sm font-medium">Have a promo code?</span>
      </motion.button>
    );
  }

  // Expanded input state
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-2"
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors pointer-events-none z-10"
            style={{ color: error ? '#dc2626' : `${brandColor}60` }}
          />
          <Input
            type="text"
            placeholder="ENTER CODE"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            disabled={isValidating}
            autoFocus
            paddingLeft={40}
            className={cn(
              'uppercase font-medium tracking-wider text-sm',
              'border-2 transition-all duration-200',
              error
                ? 'border-red-300 focus-visible:ring-red-500'
                : 'focus-visible:ring-1'
            )}
            style={{
              borderColor: error ? undefined : `${brandColor}30`,
            }}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={!inputCode.trim() || isValidating}
          className="h-11 px-5 font-semibold text-white transition-all duration-200 disabled:opacity-50"
          style={{
            backgroundColor: brandColor,
          }}
        >
          {isValidating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Apply'
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsExpanded(false);
            setInputCode('');
          }}
          className="h-11 w-11 flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm text-red-600 pl-1 flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
