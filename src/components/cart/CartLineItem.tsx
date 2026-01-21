import { Plus, Minus, Trash2, FileText, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { CartItem, formatPrice } from '../../lib/cart/useCart';
import { Button } from '../ui/button';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { WeightQuantityInput } from './WeightQuantityInput';
import {
  formatQuantityValue,
  formatUnitSuffix,
  getUnitDecimals,
  getUnitMinimum,
  getUnitQuantitySuffix,
  getUnitStep,
  isWeightUnit,
} from '../../lib/units';

interface CartLineItemProps {
  item: CartItem;
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

export const CartLineItem = ({ item, onQtyChange, onRemove }: CartLineItemProps) => {
  const modsTotal = item.mods?.reduce((sum, mod) => sum + (mod.price || 0), 0) || 0;
  const itemTotal = (item.price + modsTotal) * item.qty;

  const isWeightBased = isWeightUnit(item.priceUnit);
  const qtyStep = getUnitStep(item.priceUnit);
  const minQty = getUnitMinimum(item.priceUnit);
  const qtyDecimals = getUnitDecimals(item.priceUnit);
  const unitSuffix = formatUnitSuffix(item.priceUnit, item.unitLabel);
  const qtySuffix = isWeightBased ? getUnitQuantitySuffix(item.priceUnit) : '';

  const decrementQty = () => {
    const nextValue = Math.max(minQty, item.qty - qtyStep);
    const rounded = qtyDecimals > 0 ? Number(nextValue.toFixed(qtyDecimals)) : Math.round(nextValue);
    onQtyChange(item.id, rounded);
  };

  const incrementQty = () => {
    const nextValue = item.qty + qtyStep;
    const rounded = qtyDecimals > 0 ? Number(nextValue.toFixed(qtyDecimals)) : Math.round(nextValue);
    onQtyChange(item.id, rounded);
  };

  const quantityLabel = isWeightBased ? 'weight' : 'quantity';
  const formattedQty = isWeightBased
    ? formatQuantityValue(item.qty, item.priceUnit)
    : item.qty;

  return (
    <motion.div
      className="flex gap-3 py-3 border-b last:border-0"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {item.image ? (
          <ImageWithFallback
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm mb-1 line-clamp-1">{item.name}</h4>
        <p className="text-xs text-gray-600 mb-1">
          {formatPrice(item.price)}
          {unitSuffix && (
            <span
              className={`text-gray-400 whitespace-nowrap ${unitSuffix.startsWith('/') ? 'ml-0' : 'ml-1'}`.trim()}
            >
              {unitSuffix}
            </span>
          )}
        </p>

        {/* Modifiers */}
        {item.mods && item.mods.length > 0 && (
          <div className="text-xs text-gray-500 space-y-0.5 mb-2">
            {item.mods.map((mod, idx) => (
              <div key={idx}>
                + {mod.name}
                {mod.price && mod.price > 0 && ` (${formatPrice(mod.price)})`}
              </div>
            ))}
          </div>
        )}

        {/* Note indicator */}
        {item.note && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <FileText className="w-3 h-3" />
            <span className="line-clamp-1">{item.note}</span>
          </div>
        )}

        {/* Quantity controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg">
            <button
              onClick={decrementQty}
              disabled={item.qty <= minQty}
              className="p-1.5 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label={`Decrease ${quantityLabel}`}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            {isWeightBased ? (
              <WeightQuantityInput
                value={item.qty}
                unit={item.priceUnit}
                min={minQty}
                decimals={qtyDecimals}
                onCommit={(value) => onQtyChange(item.id, value)}
              />
            ) : (
              <span className="px-3 text-sm font-medium min-w-[3ch] text-center">
                {formattedQty}
              </span>
            )}
            <button
              onClick={incrementQty}
              className="p-1.5 hover:bg-gray-100 transition-colors"
              aria-label={`Increase ${quantityLabel}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => onRemove(item.id)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Line total */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm">{formatPrice(itemTotal)}</p>
      </div>
    </motion.div>
  );
};
