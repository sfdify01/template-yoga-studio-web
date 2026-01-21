import { useAtom, useAtomValue } from 'jotai';
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, DollarSign, Sparkles, Edit3, Percent, AlertTriangle } from 'lucide-react';
import { tipPercentageAtom, customTipAtom, cartTotalsAtom } from '../../atoms/cart';
import { formatCurrency } from '../../lib/pricing';
import { UBER_MAX_TIP_CENTS } from '../../lib/orders/fees';

interface ModernTipSelectorProps {
  brandColor?: string;
  subtotal: number;
  fulfillmentType?: 'pickup' | 'delivery';
}

export const ModernTipSelector = ({
  brandColor = '#6B0F1A',
  subtotal,
  fulfillmentType = 'pickup',
}: ModernTipSelectorProps) => {
  const [tipPercentage, setTipPercentage] = useAtom(tipPercentageAtom);
  const [customTip, setCustomTip] = useAtom(customTipAtom);
  const [customInputValue, setCustomInputValue] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customMode, setCustomMode] = useState<'percentage' | 'amount'>('percentage');
  const totals = useAtomValue(cartTotalsAtom);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate if tip exceeds Uber's max limit for delivery orders
  const maxTipDollars = UBER_MAX_TIP_CENTS / 100;
  const { exceedsUberMax, currentTipCents, cappedTipCents } = useMemo(() => {
    const tipCents = isCustom ? customTip : Math.round(subtotal * (tipPercentage / 100));
    const exceedsMax = fulfillmentType === 'delivery' && tipCents > UBER_MAX_TIP_CENTS;
    return {
      currentTipCents: tipCents,
      exceedsUberMax: exceedsMax,
      cappedTipCents: exceedsMax ? UBER_MAX_TIP_CENTS : tipCents,
    };
  }, [subtotal, tipPercentage, customTip, isCustom, fulfillmentType]);

  const presetOptions = [
    { label: '15%', percentage: 15 },
    { label: '18%', percentage: 18 },
    { label: '20%', percentage: 20 },
    { label: '25%', percentage: 25 },
  ];

  // Auto-focus input when custom is selected
  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [showCustomInput]);

  const handlePresetClick = (percentage: number) => {
    setTipPercentage(percentage);
    setCustomTip(0);
    setCustomInputValue('');
    setIsCustom(false);
    setShowCustomInput(false);
  };

  const handleCustomChipClick = () => {
    setShowCustomInput(true);
    setTipPercentage(0);
    setIsCustom(true);
  };

  const handleCustomChange = (value: string) => {
    setCustomInputValue(value);

    // Allow empty string to clear the tip
    if (value === '') {
      setCustomTip(0);
      setTipPercentage(0);
      return;
    }

    const numValue = parseFloat(value);

    // If invalid number, don't update
    if (isNaN(numValue)) {
      return;
    }

    // If in percentage mode, calculate the dollar amount from percentage
    if (customMode === 'percentage') {
      if (numValue >= 0 && numValue <= 100) {
        setTipPercentage(numValue);
        setCustomTip(0); // Clear custom dollar amount
      }
    } else {
      // Dollar amount mode
      const cents = Math.round(numValue * 100);
      if (cents >= 0) {
        setCustomTip(cents);
        setTipPercentage(0); // Clear percentage
      }
    }
  };

  const handleNoTip = () => {
    setTipPercentage(0);
    setCustomTip(0);
    setCustomInputValue('');
    setIsCustom(false);
    setShowCustomInput(false);
  };

  // Handle setting tip to Uber's max ($20)
  const handleSetMaxTip = () => {
    setTipPercentage(0); // Clear percentage
    setCustomTip(UBER_MAX_TIP_CENTS); // Set to 2000 cents ($20)
    setCustomInputValue(maxTipDollars.toString()); // Prefill with "20"
    setIsCustom(true);
    setShowCustomInput(true);
    setCustomMode('amount');
  };

  const calculateTipAmount = (percentage: number) => {
    return Math.round(subtotal * (percentage / 100));
  };

  const currentTipAmount = isCustom ? customTip : calculateTipAmount(tipPercentage);
  // Show tip display if there's a percentage selected OR if custom has a value
  const hasActiveTip = tipPercentage > 0 || (isCustom && customTip > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Header with heart icon */}
      <div className="flex items-center gap-2.5">
        <motion.div
          animate={{
            scale: hasActiveTip ? [1, 1.15, 1] : 1,
          }}
          transition={{
            duration: 0.4,
            times: [0, 0.5, 1],
          }}
        >
          <Heart
            className="w-5 h-5 transition-all duration-300"
            style={{
              color: hasActiveTip ? brandColor : '#9ca3af',
              fill: hasActiveTip ? brandColor : 'transparent',
            }}
          />
        </motion.div>
        <h3 className="text-[17px] font-semibold text-gray-900 tracking-tight">
          Add a Tip
        </h3>
        <span className="text-xs text-gray-500 ml-auto font-medium">(Optional)</span>
      </div>

      {/* Preset percentage buttons + Custom chip */}
      <div className="grid grid-cols-5 gap-2">
        {presetOptions.map((option, index) => {
          const tipAmount = calculateTipAmount(option.percentage);
          const isSelected = !isCustom && tipPercentage === option.percentage;

          return (
            <motion.button
              key={option.percentage}
              onClick={() => handlePresetClick(option.percentage)}
              className="relative rounded-2xl p-3.5 border-2 transition-all duration-200
                         hover:shadow-lg active:scale-95 overflow-hidden touch-manipulation"
              style={{
                borderColor: isSelected ? brandColor : '#e5e7eb',
                backgroundColor: isSelected ? `${brandColor}0d` : '#fff',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              type="button"
            >
              {/* Sparkle effect when selected */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    className="absolute top-1.5 right-1.5"
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 45 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Sparkles
                      className="w-3 h-3"
                      style={{ color: brandColor }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col items-center gap-1">
                <span
                  className="text-[17px] font-bold transition-colors tracking-tight"
                  style={{
                    color: isSelected ? brandColor : '#1f2937',
                  }}
                >
                  {option.label}
                </span>
                <span className="text-[11px] text-gray-600 font-semibold">
                  {formatCurrency(tipAmount / 100)}
                </span>
              </div>
            </motion.button>
          );
        })}

        {/* Custom Chip */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Custom chip clicked!');
            handleCustomChipClick();
          }}
          className="relative rounded-2xl p-3.5 border-2 transition-all duration-200
                     hover:shadow-lg active:scale-95 overflow-visible touch-manipulation cursor-pointer z-10"
          style={{
            borderColor: isCustom ? brandColor : '#e5e7eb',
            backgroundColor: isCustom ? `${brandColor}0d` : '#fff',
            pointerEvents: 'auto',
          }}
          type="button"
        >
          {/* Sparkle effect when selected */}
          {isCustom && (
            <div className="absolute top-1.5 right-1.5">
              <Sparkles
                className="w-3 h-3"
                style={{ color: brandColor }}
              />
            </div>
          )}

          <div className="flex flex-col items-center gap-1 pointer-events-none">
            <span
              className="text-[17px] font-bold transition-colors tracking-tight"
              style={{
                color: isCustom ? brandColor : '#1f2937',
              }}
            >
              Custom
            </span>
            <Edit3
              className="w-3 h-3"
              style={{
                color: isCustom ? brandColor : '#6b7280',
              }}
            />
          </div>
        </button>
      </div>

      {/* Custom tip input - shows when custom chip is tapped */}
      <AnimatePresence>
        {showCustomInput && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-700">
                  Enter custom tip
                </label>
                {/* Toggle between percentage and amount */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomMode('percentage');
                      setCustomInputValue('');
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all touch-manipulation"
                    style={{
                      backgroundColor: customMode === 'percentage' ? brandColor : 'transparent',
                      color: customMode === 'percentage' ? '#fff' : '#6b7280',
                    }}
                  >
                    <Percent className="w-3 h-3 inline mr-1" />%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomMode('amount');
                      setCustomInputValue('');
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all touch-manipulation"
                    style={{
                      backgroundColor: customMode === 'amount' ? brandColor : 'transparent',
                      color: customMode === 'amount' ? '#fff' : '#6b7280',
                    }}
                  >
                    <DollarSign className="w-3 h-3 inline mr-1" />$
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                  {customMode === 'percentage' ? (
                    <Percent
                      className="w-5 h-5 transition-colors duration-200"
                      style={{
                        color: (tipPercentage > 0 || customTip > 0) ? brandColor : '#9ca3af',
                      }}
                    />
                  ) : (
                    <DollarSign
                      className="w-5 h-5 transition-colors duration-200"
                      style={{
                        color: (tipPercentage > 0 || customTip > 0) ? brandColor : '#9ca3af',
                      }}
                    />
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="decimal"
                  step={customMode === 'percentage' ? '1' : '0.01'}
                  min="0"
                  max={customMode === 'percentage' ? '100' : undefined}
                  placeholder={customMode === 'percentage' ? '0' : '0.00'}
                  value={customInputValue}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  className="w-full pr-5 py-4 text-lg font-semibold border-2 rounded-2xl
                             transition-all duration-200 focus:outline-none
                             focus:ring-2 focus:ring-offset-2 touch-manipulation"
                  style={{
                    paddingLeft: '44px',
                    borderColor: (tipPercentage > 0 || customTip > 0) ? brandColor : '#e5e7eb',
                    backgroundColor: (tipPercentage > 0 || customTip > 0) ? `${brandColor}08` : '#fff',
                    ...((tipPercentage > 0 || customTip > 0) && {
                      '--tw-ring-color': brandColor,
                    } as React.CSSProperties),
                  }}
                />
              </div>
              <p className="text-xs text-gray-600 font-medium px-1">
                💯 100% of your tip goes directly to the staff
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No tip option */}
      <div className="flex justify-center">
        <button
          onClick={handleNoTip}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors
                     underline decoration-dotted underline-offset-4 font-medium
                     px-3 py-1.5 rounded-lg hover:bg-gray-50 touch-manipulation"
          type="button"
        >
          No tip
        </button>
      </div>

      {/* Tip amount display with animation */}
      <AnimatePresence mode="wait">
        {hasActiveTip && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div
              className="p-5 rounded-2xl border-2 relative overflow-hidden shadow-sm"
              style={{
                borderColor: `${brandColor}30`,
                backgroundColor: `${brandColor}0a`,
              }}
            >
              {/* Decorative gradient overlay */}
              <div
                className="absolute inset-0 opacity-5"
                style={{
                  background: `radial-gradient(circle at top right, ${brandColor} 0%, transparent 70%)`,
                }}
              />

              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: brandColor,
                    }}
                    initial={{ scale: 0.8, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Heart className="w-5 h-5 text-white fill-white" />
                  </motion.div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                      Thank you for your generosity!
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5 font-medium">
                      💯 Goes directly to the staff
                    </p>
                  </div>
                </div>
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="text-right flex-shrink-0"
                >
                  <p className="text-2xl font-bold tracking-tight" style={{ color: brandColor }}>
                    {formatCurrency(currentTipAmount / 100)}
                  </p>
                  {isCustom && (
                    <p className="text-[11px] text-gray-600 font-medium mt-0.5">Custom amount</p>
                  )}
                  {!isCustom && tipPercentage > 0 && (
                    <p className="text-[11px] text-gray-600 font-medium mt-0.5">{tipPercentage}% of subtotal</p>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uber Max Tip Warning Banner */}
      <AnimatePresence>
        {exceedsUberMax && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 space-y-2">
                <p className="font-semibold">
                  Uber Direct has a maximum tip of ${maxTipDollars.toFixed(2)}
                </p>
                <p className="text-amber-700">
                  Your tip of ${(currentTipCents / 100).toFixed(2)} exceeds this limit.
                  The courier will receive ${(cappedTipCents / 100).toFixed(2)} and you won&apos;t be charged for the excess.
                </p>
                <button
                  type="button"
                  onClick={handleSetMaxTip}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white font-semibold text-sm rounded-lg hover:bg-amber-700 transition-colors touch-manipulation"
                >
                  <DollarSign className="w-4 h-4" />
                  Set tip to ${maxTipDollars.toFixed(2)}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
