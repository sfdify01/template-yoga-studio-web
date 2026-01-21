import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { formatCurrency } from '../../lib/pricing';

interface TipSelectorProps {
  subtotal: number;
  onTipChange: (amount: number) => void;
  initialTip?: number;
}

export const TipSelector = ({ subtotal, onTipChange, initialTip = 0 }: TipSelectorProps) => {
  const [selectedTip, setSelectedTip] = useState<number | 'custom'>(initialTip);
  const [customAmount, setCustomAmount] = useState('');

  const tipPresets = [
    { label: '15%', value: subtotal * 0.15 },
    { label: '18%', value: subtotal * 0.18 },
    { label: '20%', value: subtotal * 0.20 },
    { label: '25%', value: subtotal * 0.25 },
  ];

  const handleTipSelect = (tip: number) => {
    setSelectedTip(tip);
    setCustomAmount('');
    onTipChange(tip);
  };

  const handleCustomTip = (value: string) => {
    setCustomAmount(value);
    const amount = parseFloat(value) || 0;
    setSelectedTip('custom');
    onTipChange(amount);
  };

  return (
    <div className="space-y-4">
      <Label className="font-semibold">Add a Tip (Optional)</Label>
      
      <div className="grid grid-cols-4 gap-2">
        {tipPresets.map((preset) => (
          <Button
            key={preset.label}
            variant={selectedTip === preset.value ? 'default' : 'outline'}
            onClick={() => handleTipSelect(preset.value)}
            className="rounded-xl h-16 flex flex-col items-center justify-center"
            type="button"
          >
            <div className="text-center">
              <div className="text-sm font-medium">{preset.label}</div>
              <div className="text-xs opacity-75 mt-0.5">
                {formatCurrency(preset.value)}
              </div>
            </div>
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Custom amount"
            value={customAmount}
            onChange={(e) => handleCustomTip(e.target.value)}
            className="rounded-xl h-11"
          />
        </div>
        {customAmount && (
          <Button
            variant="ghost"
            onClick={() => {
              setCustomAmount('');
              setSelectedTip(0);
              onTipChange(0);
            }}
            type="button"
            className="rounded-xl"
          >
            Clear
          </Button>
        )}
      </div>

      <p className="text-xs text-gray-600">
        💝 100% of your tip goes directly to the restaurant staff
      </p>
    </div>
  );
};
