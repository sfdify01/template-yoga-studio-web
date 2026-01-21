import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DollarSign, Percent, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { UBER_MAX_TIP_CENTS } from '../../lib/orders/fees';

interface SmartTipSelectorProps {
  subtotal: number; // in dollars (e.g., 150.00)
  currentTip: {
    mode: 'percent' | 'amount';
    value: number;
  };
  presets: number[]; // e.g., [10, 15, 20]
  brandColor: string;
  onChange: (tip: { mode: 'percent' | 'amount'; value: number }) => void;
  fulfillmentType?: 'pickup' | 'delivery';
}

export const SmartTipSelector = ({
  subtotal,
  currentTip,
  presets,
  brandColor,
  onChange,
  fulfillmentType = 'pickup',
}: SmartTipSelectorProps) => {
  const [customMode, setCustomMode] = useState<'percent' | 'amount'>('percent');
  const [customValue, setCustomValue] = useState('');
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  // Calculate tip in cents and check against Uber's max limit
  const maxTipDollars = UBER_MAX_TIP_CENTS / 100;
  const { tipAmountCents, exceedsUberMax, cappedTipCents } = useMemo(() => {
    const tipDollars = currentTip.mode === 'percent'
      ? (subtotal * currentTip.value) / 100
      : currentTip.value;
    const tipCents = Math.round(tipDollars * 100);
    const exceedsMax = fulfillmentType === 'delivery' && tipCents > UBER_MAX_TIP_CENTS;
    return {
      tipAmountCents: tipCents,
      exceedsUberMax: exceedsMax,
      cappedTipCents: exceedsMax ? UBER_MAX_TIP_CENTS : tipCents,
    };
  }, [subtotal, currentTip, fulfillmentType]);

  const handlePresetClick = (percent: number) => {
    onChange({ mode: 'percent', value: percent });
    setIsCustomOpen(false); // Close custom UI when switching back to a preset
    setCustomValue('');
    setCustomMode('percent');
  };

  const handleCustomApply = () => {
    const value = parseFloat(customValue);
    if (!isNaN(value) && value >= 0) {
      onChange({ mode: customMode, value });
      setIsCustomOpen(false);
      setCustomValue('');
    }
  };

  const calculateTipAmount = (mode: 'percent' | 'amount', value: number) => {
    if (mode === 'percent') {
      return (subtotal * value) / 100;
    }
    return value;
  };

  const isPresetSelected = (percent: number) => {
    return currentTip.mode === 'percent' && currentTip.value === percent;
  };

  const isCustomSelected =
    (currentTip.mode === 'amount') ||
    (currentTip.mode === 'percent' && !presets.includes(currentTip.value));

  return (
    <div className="rounded-xl bg-gray-50 p-4 border border-gray-100 space-y-3">
      <h3 className="font-semibold text-gray-800">Add a tip</h3>

      {/* Preset Buttons - Wrapping */}
      <div className="flex flex-wrap gap-2">
        {presets.map((percent) => (
          <button
            key={percent}
            onClick={() => handlePresetClick(percent)}
            aria-pressed={isPresetSelected(percent)}
            className="px-3 h-9 rounded-full border text-sm transition-all aria-pressed:text-white"
            style={
              isPresetSelected(percent)
                ? { backgroundColor: brandColor, borderColor: brandColor }
                : {}
            }
          >
            {percent}%
          </button>
        ))}

        {/* Custom Tip - Toggle */}
        <button
          onClick={() => {
            if (!isCustomOpen) {
              // Clear preset selection when opening custom
              onChange({ mode: 'percent', value: 0 });
            }
            setIsCustomOpen(!isCustomOpen);
          }}
          aria-pressed={isCustomSelected || isCustomOpen}
          className="px-3 h-9 rounded-full border text-sm transition-all aria-pressed:text-white"
          style={
            (isCustomSelected || isCustomOpen)
              ? { backgroundColor: brandColor, borderColor: brandColor, color: 'white' }
              : {}
          }
        >
          Custom
        </button>
      </div>

      {/* Custom Tip Input - Inline */}
      <AnimatePresence>
        {isCustomOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-3">
              <div className="text-sm font-medium">Custom tip</div>

              {/* Mode Selector */}
              <div className="flex gap-2">
                <Button
                  variant={customMode === 'percent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCustomMode('percent')}
                  className="flex-1"
                  style={
                    customMode === 'percent'
                      ? { backgroundColor: brandColor, color: 'white' }
                      : {}
                  }
                >
                  <Percent className="w-3.5 h-3.5 mr-1" />
                  Percent
                </Button>
                <Button
                  variant={customMode === 'amount' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCustomMode('amount')}
                  className="flex-1"
                  style={
                    customMode === 'amount'
                      ? { backgroundColor: brandColor, color: 'white' }
                      : {}
                  }
                >
                  <DollarSign className="w-3.5 h-3.5 mr-1" />
                  Amount
                </Button>
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {customMode === 'amount' && (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none z-10">
                      $
                    </span>
                  )}
                  <Input
                    type="number"
                    value={customValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomValue(e.target.value)}
                    autoFocus
                    placeholder={customMode === 'percent' ? 'e.g., 18' : 'e.g., 5.00'}
                    paddingLeft={customMode === 'amount' ? 32 : 12}
                    paddingRight={customMode === 'percent' ? 32 : 12}
                    min="0"
                    step={customMode === 'percent' ? '1' : '0.01'}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        handleCustomApply();
                      }
                    }}
                  />
                  {customMode === 'percent' && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none z-10">
                      %
                    </span>
                  )}
                </div>
                <Button
                  onClick={handleCustomApply}
                  style={{ backgroundColor: brandColor }}
                  className="text-white"
                >
                  Apply
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tip Amount Display */}
      {currentTip.value > 0 && (
        <div className="text-xs text-gray-500">
          Tip amount: ${calculateTipAmount(currentTip.mode, currentTip.value).toFixed(2)}
        </div>
      )}

      {/* Uber Max Tip Warning */}
      <AnimatePresence>
        {exceedsUberMax && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg mt-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 space-y-1">
                <p className="font-medium">
                  Uber Direct has a maximum tip of ${maxTipDollars.toFixed(2)}
                </p>
                <p className="text-amber-700">
                  Your tip of ${(tipAmountCents / 100).toFixed(2)} exceeds this limit.
                  The courier will receive ${(cappedTipCents / 100).toFixed(2)} and you won&apos;t be charged for the excess.
                </p>
                <button
                  type="button"
                  onClick={() => onChange({ mode: 'amount', value: maxTipDollars })}
                  className="font-medium underline hover:no-underline text-amber-800"
                >
                  Set tip to ${maxTipDollars.toFixed(2)}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
