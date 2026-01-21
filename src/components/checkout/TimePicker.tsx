import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { WhenType, TimeWindow } from '../../lib/types';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  mode: WhenType;
  windows: TimeWindow[];
  selectedWindow: string;
  onSelect: (window: TimeWindow) => void;
}

export const TimePicker = ({
  mode,
  windows,
  selectedWindow,
  onSelect,
}: TimePickerProps) => {
  return (
    <div className="space-y-3">
      <RadioGroup value={selectedWindow} onValueChange={(value) => {
        const window = windows.find(w => w.value === value);
        if (window) onSelect(window);
      }}>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {windows.map((window) => (
            <div
              key={window.value}
              className={`flex items-center space-x-3 p-3 rounded-xl border transition-colors ${
                !window.available 
                  ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                  : 'cursor-pointer hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <RadioGroupItem
                value={window.value}
                id={window.value}
                disabled={!window.available}
              />
              <Label
                htmlFor={window.value}
                className={`flex-1 cursor-pointer ${!window.available ? 'cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{window.label}</span>
                  {window.eta && (
                    <span className="text-sm text-gray-500">
                      {window.eta}
                    </span>
                  )}
                </div>
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
};
