import { useState } from 'react';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { MenuItem, ModifierGroup } from '../lib/types';
import { formatCurrency, calculateItemSubtotal } from '../lib/pricing';

interface OptionPickerProps {
  item: MenuItem;
  open: boolean;
  onClose: () => void;
  onAddToCart: (
    item: MenuItem,
    qty: number,
    mods?: { id: string; name: string; price: number }[],
    note?: string
  ) => void;
  brandColor: string;
}

export const OptionPicker = ({
  item,
  open,
  onClose,
  onAddToCart,
  brandColor,
}: OptionPickerProps) => {
  const [selectedMods, setSelectedMods] = useState<
    { id: string; name: string; price: number }[]
  >([]);
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(1);

  const hasModifiers = item.modifiers && item.modifiers.length > 0;

  const handleModifierToggle = (
    group: ModifierGroup,
    option: { id: string; name: string; price: number }
  ) => {
    setSelectedMods((prev) => {
      const exists = prev.find((m) => m.id === option.id);

      if (exists) {
        // Remove
        return prev.filter((m) => m.id !== option.id);
      } else {
        // Add
        if (group.max === 1) {
          // Radio behavior - remove others from same group
          const filtered = prev.filter(
            (m) => !group.options.find((o) => o.id === m.id)
          );
          return [...filtered, option];
        } else {
          // Checkbox behavior
          if (group.max && prev.filter((m) => group.options.find((o) => o.id === m.id)).length >= group.max) {
            // Max reached, don't add
            return prev;
          }
          return [...prev, option];
        }
      }
    });
  };

  const isSelected = (optionId: string) => {
    return selectedMods.some((m) => m.id === optionId);
  };

  const canAddToCart = () => {
    if (!hasModifiers) return true;

    // Check required modifiers
    return item.modifiers!.every((group) => {
      if (!group.required) return true;

      const selectedFromGroup = selectedMods.filter((m) =>
        group.options.find((o) => o.id === m.id)
      );

      const minMet = group.min ? selectedFromGroup.length >= group.min : selectedFromGroup.length > 0;
      const maxMet = group.max ? selectedFromGroup.length <= group.max : true;

      return minMet && maxMet;
    });
  };

  const handleAdd = () => {
    onAddToCart(item, qty, selectedMods.length > 0 ? selectedMods : undefined, note || undefined);
    handleClose();
  };

  const handleClose = () => {
    setSelectedMods([]);
    setNote('');
    setQty(1);
    onClose();
  };

  const totalPrice = calculateItemSubtotal(item.price, qty, selectedMods);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          <p className="text-gray-600">{item.description}</p>

          {/* Dietary & Allergen Info */}
          {(item.dietary || item.allergens) && (
            <div className="flex flex-wrap gap-2">
              {item.dietary?.map((diet) => (
                <span
                  key={diet}
                  className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800"
                >
                  {diet}
                </span>
              ))}
              {item.allergens?.map((allergen) => (
                <span
                  key={allergen}
                  className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800"
                >
                  Contains {allergen}
                </span>
              ))}
            </div>
          )}

          {/* Modifiers */}
          {hasModifiers && (
            <div className="space-y-4">
              {item.modifiers!.map((group) => (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      {group.name}
                      {group.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <span className="text-xs text-gray-500">
                      {group.max === 1
                        ? 'Choose 1'
                        : group.min && group.max
                        ? `Choose ${group.min}-${group.max}`
                        : group.max
                        ? `Up to ${group.max}`
                        : 'Choose any'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.options.map((option) => {
                      const selected = isSelected(option.id);
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleModifierToggle(group, option)}
                          disabled={!option.available}
                          className={`w-full p-3 rounded-2xl border-2 transition-all flex items-center justify-between ${
                            selected
                              ? 'border-current bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${!option.available && 'opacity-50 cursor-not-allowed'}`}
                          style={selected ? { borderColor: brandColor } : {}}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selected ? 'border-current bg-current' : 'border-gray-300'
                              }`}
                              style={selected ? { backgroundColor: brandColor, borderColor: brandColor } : {}}
                            >
                              {selected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span>{option.name}</span>
                          </div>
                          {option.price > 0 && (
                            <span className="text-sm">+{formatCurrency(option.price)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label htmlFor="note">Special Instructions (Optional)</Label>
            <Textarea
              id="note"
              placeholder="No onions, extra sauce, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              rows={3}
              className="rounded-2xl"
            />
            <span className="text-xs text-gray-500">{note.length}/200</span>
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between">
            <Label>Quantity</Label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                -
              </button>
              <span className="w-8 text-center">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            size="lg"
            className="w-full text-white"
            style={{ backgroundColor: brandColor }}
            onClick={handleAdd}
            disabled={!canAddToCart()}
          >
            Add {qty} to Cart - {formatCurrency(totalPrice)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
