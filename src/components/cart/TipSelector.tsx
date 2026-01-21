import { motion } from 'motion/react';

interface TipSelectorProps {
  tipPercentage: number;
  onSelectTip: (percentage: number) => void;
  brandColor?: string;
}

const TIP_OPTIONS = [
  { label: '10%', value: 10 },
  { label: '15%', value: 15 },
  { label: '20%', value: 20 },
  { label: 'No tip', value: 0 },
];

export const TipSelector = ({ 
  tipPercentage, 
  onSelectTip,
  brandColor = '#6B0F1A' 
}: TipSelectorProps) => {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' && index < TIP_OPTIONS.length - 1) {
      onSelectTip(TIP_OPTIONS[index + 1].value);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      onSelectTip(TIP_OPTIONS[index - 1].value);
    }
  };

  return (
    <div className="mb-6">
      <label className="text-sm mb-3 block">Support the team</label>
      <div className="grid grid-cols-4 gap-2">
        {TIP_OPTIONS.map((option, index) => {
          const isSelected = tipPercentage === option.value;
          
          return (
            <motion.button
              key={option.value}
              onClick={() => onSelectTip(option.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              whileTap={{ scale: 0.95 }}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isSelected
                  ? 'text-white shadow-md'
                  : 'border border-gray-300 hover:border-gray-400 bg-white'
              }`}
              style={
                isSelected
                  ? { 
                      backgroundColor: brandColor,
                      focusRingColor: brandColor 
                    }
                  : {}
              }
              aria-label={`Tip ${option.label}`}
              aria-pressed={isSelected}
              tabIndex={0}
            >
              {option.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
