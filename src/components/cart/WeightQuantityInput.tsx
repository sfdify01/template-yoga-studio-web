import { useEffect, useState } from 'react';
import {
  formatQuantityValue,
  getUnitQuantitySuffix,
} from '../../lib/units';

interface WeightQuantityInputProps {
  value: number;
  unit?: string | null;
  min: number;
  max?: number;
  decimals: number;
  onCommit: (value: number) => void;
}

export const WeightQuantityInput = ({
  value,
  unit,
  min,
  max,
  decimals,
  onCommit,
}: WeightQuantityInputProps) => {
  const [draft, setDraft] = useState(() => formatQuantityValue(value, unit));
  const [isFocused, setIsFocused] = useState(false);
  const suffix = getUnitQuantitySuffix(unit);

  useEffect(() => {
    if (!isFocused) {
      setDraft(formatQuantityValue(value, unit));
    }
  }, [value, unit, isFocused]);

  const clampValue = (input: number) => {
    let result = input;
    if (Number.isFinite(max)) {
      result = Math.min(result, max as number);
    }
    result = Math.max(result, min);
    return Number(result.toFixed(decimals));
  };

  const commit = () => {
    const parsed = parseFloat(draft);
    if (Number.isNaN(parsed)) {
      setDraft(formatQuantityValue(value, unit));
      return;
    }
    const normalized = clampValue(parsed);
    setDraft(formatQuantityValue(normalized, unit));
    onCommit(normalized);
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        className="w-16 h-8 border-0 text-center text-sm font-medium focus:outline-none focus:ring-0"
        value={draft}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          commit();
        }}
        onChange={(e) => {
          const next = e.target.value;
          if (
            next === '' ||
            next === '.' ||
            /^\d*(?:\.\d*)?$/.test(next)
          ) {
            setDraft(next);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        aria-label="Enter weight"
      />
      {suffix && (
        <span className="absolute inset-y-0 right-1 flex items-center text-[11px] text-gray-500 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
};
