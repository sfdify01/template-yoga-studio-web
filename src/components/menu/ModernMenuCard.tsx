import { useState } from 'react';
import { motion } from 'motion/react';
import { Star, Plus, Minus } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { MenuItem } from '../../hooks/useConfig';
import { ProductPrice } from './ProductPrice';
import { WeightQuantityInput } from '../cart/WeightQuantityInput';
import {
  formatUnitSuffix,
  getUnitDecimals,
  getUnitMinimum,
  getUnitStep,
  isWeightUnit,
  normalizeUnit,
} from '../../lib/units';

interface ModernMenuCardProps {
  item: MenuItem;
  brandColor: string;
  onAdd: (item: MenuItem, qty: number) => void;
}

export const ModernMenuCard = ({ item, brandColor, onAdd }: ModernMenuCardProps) => {
  const normalizedUnit = normalizeUnit(item.unit);
  const isWeightBased = isWeightUnit(normalizedUnit);
  const step = getUnitStep(normalizedUnit);
  const minQty = getUnitMinimum(normalizedUnit);
  const qtyDecimals = getUnitDecimals(normalizedUnit);
  // Start weight-based items at 1 (not minQty) for better UX, but allow decrementing to minQty
  const [qty, setQty] = useState(1);

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWeightBased) {
      const next = Math.max(minQty, qty - step);
      setQty(Number(next.toFixed(qtyDecimals)));
    } else if (qty > 1) {
      setQty(qty - 1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWeightBased) {
      const next = qty + step;
      setQty(Number(next.toFixed(qtyDecimals)));
    } else if (qty < 99) {
      setQty(qty + 1);
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Always add directly to cart (no modal)
    onAdd(item, qty);
  };

  // Use discounted price if available and valid, otherwise use regular price
  const effectivePrice = (item.discountedPrice && item.originalPrice && item.discountedPrice < item.originalPrice) 
    ? item.discountedPrice 
    : item.price;
  const unitSuffix = formatUnitSuffix(normalizedUnit, item.unitLabel);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="w-full rounded-lg sm:rounded-xl md:rounded-2xl shadow-sm hover:shadow-md transition-all p-2.5 sm:p-3 md:p-4 bg-white"
    >
      {/* Image */}
      <div 
        className="aspect-[4/3] rounded-md sm:rounded-lg md:rounded-xl bg-gray-100 overflow-hidden relative group mb-2.5 sm:mb-3"
      >
        <ImageWithFallback
          src={item.imageUrl || `https://source.unsplash.com/800x600/?${encodeURIComponent(item.image || item.name)}`}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Badges */}
        <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 flex gap-1.5 sm:gap-2">
          {item.popular && (
            <Badge 
              className="text-white shadow-lg text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5"
              style={{ backgroundColor: brandColor }}
            >
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 fill-current" />
              Popular
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1.5 sm:space-y-2">
        {/* Title & Price */}
        <div className="flex justify-between items-start gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
            <h3 className="text-sm sm:text-[15px] md:text-base leading-tight line-clamp-2 pr-1">{item.name}</h3>
            {item.dietary.length > 0 && (
              <div className="flex gap-0.5 sm:gap-1 flex-shrink-0">
                {item.dietary.includes('vegetarian') && (
                  <span className="text-xs sm:text-sm" title="Vegetarian">🥬</span>
                )}
                {item.dietary.includes('vegan') && (
                  <span className="text-xs sm:text-sm" title="Vegan">🌱</span>
                )}
                {item.dietary.includes('gf') && (
                  <span className="text-xs sm:text-sm" title="Gluten-Free">🌾</span>
                )}
              </div>
            )}
          </div>
          <span style={{ color: brandColor }}>
            <ProductPrice
              price={item.price}
              originalPrice={item.originalPrice}
              discountedPrice={item.discountedPrice}
              unit={normalizedUnit}
              unitLabel={item.unitLabel}
              className="text-sm sm:text-[15px] md:text-base font-semibold flex-shrink-0"
            />
          </span>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 leading-relaxed">
          {item.description}
        </p>

        {/* Actions Row - Balanced proportions */}
        <div className="flex items-stretch gap-2 sm:gap-2.5 pt-1.5 sm:pt-2">
          {/* Qty Stepper - Takes ~50% width */}
          <div className="flex-1 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/80 overflow-hidden">
            <button
              onClick={handleDecrement}
              disabled={isWeightBased ? qty <= minQty : qty <= 1}
              className="p-2 sm:p-2.5 hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-w-[40px] sm:min-w-[44px] h-full flex items-center justify-center touch-manipulation"
              aria-label={isWeightBased ? 'Decrease weight' : 'Decrease quantity'}
            >
              <Minus className="w-4 h-4" />
            </button>
            {isWeightBased ? (
              <div className="flex-1 flex justify-center">
                <WeightQuantityInput
                  value={qty}
                  unit={normalizedUnit}
                  min={minQty}
                  decimals={qtyDecimals}
                  onCommit={(val) => setQty(val)}
                />
              </div>
            ) : (
              <span className="flex-1 text-sm sm:text-base font-semibold text-center tabular-nums">
                {qty}
              </span>
            )}
            <button
              onClick={handleIncrement}
              disabled={!isWeightBased && qty >= 99}
              className="p-2 sm:p-2.5 hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-w-[40px] sm:min-w-[44px] h-full flex items-center justify-center touch-manipulation"
              aria-label={isWeightBased ? 'Increase weight' : 'Increase quantity'}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add Button - Takes ~50% width */}
          <Button
            onClick={handleQuickAdd}
            className="flex-1 text-white h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-lg touch-manipulation active:scale-[0.98] transition-transform shadow-sm hover:shadow-md"
            style={{ backgroundColor: brandColor }}
            aria-label={`Add to cart: ${item.name}`}
          >
            Add
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
