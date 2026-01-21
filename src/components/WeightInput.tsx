import { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface WeightInputProps {
  value: number; // in pounds
  onChange: (value: number) => void;
  pricePerUnit: number; // price per pound in dollars
  unit?: 'lb' | 'oz' | 'kg';
  min?: number;
  max?: number;
  step?: number;
  brandColor?: string;
}

/**
 * Weight input component with butcher-scale aesthetic
 * Designed to feel precise, tactile, and professional
 */
export function WeightInput({
  value,
  onChange,
  pricePerUnit,
  unit = 'lb',
  min = 0.25,
  max = 20,
  step = 0.25,
  brandColor = '#6B0F1A',
}: WeightInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  // Sync with external value changes
  useEffect(() => {
    if (!isFocused) {
      setInputValue(value.toFixed(2));
    }
  }, [value, isFocused]);

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(Number(newValue.toFixed(2)));
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(Number(newValue.toFixed(2)));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const numVal = parseFloat(val);
    if (!isNaN(numVal) && numVal >= min && numVal <= max) {
      onChange(Number(numVal.toFixed(2)));
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    const numVal = parseFloat(inputValue);
    if (isNaN(numVal) || numVal < min) {
      onChange(min);
    } else if (numVal > max) {
      onChange(max);
    } else {
      onChange(Number(numVal.toFixed(2)));
    }
  };

  const totalPrice = value * pricePerUnit;

  // Quick select buttons for common weights
  const quickWeights = [0.5, 1, 1.5, 2, 3, 5];

  return (
    <div className="space-y-4">
      {/* Price Display - Large and Clear */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-sm font-medium text-gray-600 tracking-wide">UNIT PRICE</span>
          <span className="text-lg font-bold text-gray-900" style={{ fontFamily: 'monospace' }}>
            ${pricePerUnit.toFixed(2)}<span className="text-sm text-gray-500">/{unit}</span>
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-gray-600 tracking-wide">TOTAL</span>
          <motion.span
            key={totalPrice}
            initial={{ scale: 1.1, color: brandColor }}
            animate={{ scale: 1, color: '#111827' }}
            className="text-3xl font-bold"
            style={{ fontFamily: 'monospace', letterSpacing: '-0.02em' }}
          >
            ${totalPrice.toFixed(2)}
          </motion.span>
        </div>
      </div>

      {/* Weight Input - Digital Scale Style */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-700 tracking-wide block">
          SELECT WEIGHT
        </label>

        {/* Main Input with +/- Buttons */}
        <div className="flex items-stretch gap-2">
          <button
            onClick={handleDecrement}
            disabled={value <= min}
            className="w-14 h-14 flex items-center justify-center rounded-lg border-2 border-gray-300 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 bg-white"
            aria-label="Decrease weight"
          >
            <Minus className="w-5 h-5 text-gray-700" strokeWidth={2.5} />
          </button>

          <div className="flex-1 relative">
            <input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={handleInputBlur}
              min={min}
              max={max}
              step={step}
              className="w-full h-14 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-all outline-none bg-white"
              style={{
                fontFamily: 'monospace',
                letterSpacing: '0.02em'
              }}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">
              {unit}
            </div>
          </div>

          <button
            onClick={handleIncrement}
            disabled={value >= max}
            className="w-14 h-14 flex items-center justify-center rounded-lg border-2 border-gray-300 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 bg-white"
            aria-label="Increase weight"
          >
            <Plus className="w-5 h-5 text-gray-700" strokeWidth={2.5} />
          </button>
        </div>

        {/* Range Slider */}
        <div className="relative pt-2 pb-1">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, ${brandColor} 0%, ${brandColor} ${((value - min) / (max - min)) * 100}%, #e5e7eb ${((value - min) / (max - min)) * 100}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{min} {unit}</span>
            <span>{max} {unit}</span>
          </div>
        </div>

        {/* Quick Select Buttons */}
        <div className="grid grid-cols-6 gap-2">
          {quickWeights.map((weight) => (
            <button
              key={weight}
              onClick={() => onChange(weight)}
              className={`h-9 rounded-lg text-sm font-semibold transition-all border-2 ${
                value === weight
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {weight}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        /* Custom slider thumb styles */
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${brandColor};
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          transition: transform 0.15s ease;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }

        .slider::-webkit-slider-thumb:active {
          transform: scale(1.05);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${brandColor};
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          transition: transform 0.15s ease;
        }

        .slider::-moz-range-thumb:hover {
          transform: scale(1.15);
        }

        .slider::-moz-range-thumb:active {
          transform: scale(1.05);
        }

        /* Hide number input spinners */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
