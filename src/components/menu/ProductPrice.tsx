/**
 * ProductPrice Component
 * Displays product price with unit information (e.g., "$18.99 / lb" or "$4.50 each")
 * Supports discount pricing with strikethrough original price
 */

import type { PriceUnit } from '../../atoms/cart';
import {
  formatUnitAriaSuffix,
  formatUnitSuffix,
} from '../../lib/units';

interface ProductPriceProps {
  price: number | string;
  originalPrice?: number; // Original price before discount
  discountedPrice?: number; // Discounted sale price
  unit?: PriceUnit;
  unitLabel?: string;
  className?: string;
  showDiscount?: boolean; // Whether to show discount pricing
}

export const ProductPrice = ({ 
  price, 
  originalPrice,
  discountedPrice,
  unit = 'lb', 
  unitLabel,
  className = '',
  showDiscount = true
}: ProductPriceProps) => {
  // Check if we should show discount pricing
  const hasValidDiscount = showDiscount && 
    originalPrice !== undefined && 
    discountedPrice !== undefined && 
    discountedPrice < originalPrice;

  // Use discounted price if available, otherwise use regular price
  const displayPrice = hasValidDiscount ? discountedPrice : price;
  
  // Convert price to number if string
  const numericPrice = typeof displayPrice === 'string' ? parseFloat(displayPrice) : displayPrice;
  
  // Format price using Intl.NumberFormat
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formattedPrice = formatPrice(numericPrice);
  const formattedOriginalPrice = originalPrice ? formatPrice(originalPrice) : '';

  // Determine unit text based on rules
  const unitSuffix = formatUnitSuffix(unit, unitLabel);
  const ariaUnitSuffix = formatUnitAriaSuffix(unit, unitLabel);
  const suffixClass = unitSuffix.startsWith('/') ? 'ml-0' : 'ml-1';
  const renderUnit = (text: string) => (
    <span className={`whitespace-nowrap ${suffixClass}`.trim()}>{text}</span>
  );

  // Create accessible label
  const dollars = Math.floor(numericPrice);
  const cents = Math.round((numericPrice - dollars) * 100);
  const unitTextForAria = ariaUnitSuffix || 'each';
  const ariaLabel = hasValidDiscount 
    ? `Sale price ${dollars} dollars${cents > 0 ? ` ${cents} cents` : ''} ${unitTextForAria}, was ${formatPrice(originalPrice!)}`
    : `Price ${dollars} dollars${cents > 0 ? ` ${cents} cents` : ''} ${unitTextForAria}`;

  if (hasValidDiscount) {
    return (
      <span className={`${className} flex flex-col items-end gap-0.5`} aria-label={ariaLabel}>
        {/* Strikethrough Original Price */}
        <span className="text-xs sm:text-sm text-gray-400 line-through leading-none">
          {formattedOriginalPrice}
          {unitSuffix && renderUnit(unitSuffix)}
        </span>
        {/* Discounted Price */}
        <span className="leading-none">
          {formattedPrice}
          {unitSuffix && renderUnit(unitSuffix)}
        </span>
      </span>
    );
  }

  return (
    <span 
      className={className}
      aria-label={ariaLabel}
    >
      {formattedPrice}
      {unitSuffix && renderUnit(unitSuffix)}
    </span>
  );
};
