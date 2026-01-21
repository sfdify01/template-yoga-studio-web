/**
 * Adapter to use UniversalMenuItemModal with existing Tabsy menu data
 * Converts legacy MenuItem format to UniversalMenuItem format
 */

import { useState } from 'react';
import { MenuItem } from '../../hooks/useConfig';
import { UniversalMenuItem, ThemeTokens, toMoney, Badge } from '../../lib/menu/types';
import { UniversalMenuItemModal, AddToCartPayload } from './UniversalMenuItemModal';
import { useCart } from '../../lib/cart/useCart';
import { toast } from 'sonner';
import { normalizeUnit } from '../../lib/units';

interface MenuModalAdapterProps {
  item: MenuItem;
  brandColor: string;
  onClose: () => void;
  allMenuItems?: MenuItem[];
  categoryId?: string;
  onItemClick?: (item: MenuItem) => void;
}

/**
 * Convert legacy MenuItem to UniversalMenuItem format
 */
function convertToUniversalFormat(item: MenuItem): UniversalMenuItem {
  // Map dietary tags to badges
  const badges: Badge[] = [];
  
  if (item.dietary?.includes('vegetarian')) {
    badges.push({ id: 'vegetarian', label: 'Vegetarian', icon: '🥬', tone: 'success' });
  }
  if (item.dietary?.includes('vegan')) {
    badges.push({ id: 'vegan', label: 'Vegan', icon: '🌱', tone: 'success' });
  }
  if (item.dietary?.includes('gf')) {
    badges.push({ id: 'gf', label: 'Gluten-Free', icon: '🌾', tone: 'info' });
  }
  if (item.popular) {
    badges.push({ id: 'popular', label: 'Popular', icon: '⭐', tone: 'warning' });
  }

  // Convert add-ons to addon groups (if present)
  const addonGroups = item.addOns && item.addOns.length > 0 ? [
    {
      id: 'extras',
      title: 'Add Extras',
      type: 'multi' as const,
      required: false,
      max: 3,
      choices: item.addOns.map((addon, idx) => {
        // Parse addon string like "Grilled Chicken +$6"
        const match = addon.match(/(.+?)\s*\+\$(\d+(?:\.\d{2})?)/);
        if (match) {
          return {
            id: `addon-${idx}`,
            label: match[1].trim(),
            priceDeltaCents: Math.round(parseFloat(match[2]) * 100),
          };
        }
        return {
          id: `addon-${idx}`,
          label: addon,
          priceDeltaCents: 0,
        };
      }),
    },
  ] : undefined;

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    basePrice: toMoney(Math.round(item.price * 100)),
    imageUrl: item.imageUrl || `https://source.unsplash.com/800x600/?${encodeURIComponent(item.image)}`,
    tags: badges.length > 0 ? badges : undefined,
    addonGroups,
    notesPlaceholder: 'e.g., No onions, extra sauce, well done...',
    soldOut: false,
  };
}

/**
 * Adapter component that wraps UniversalMenuItemModal
 */
export const MenuModalAdapter = ({
  item,
  brandColor,
  onClose,
  allMenuItems = [],
  categoryId = '',
  onItemClick,
}: MenuModalAdapterProps) => {
  const { addItem } = useCart();
  
  // Convert to universal format
  const universalItem = convertToUniversalFormat(item);
  
  // Convert all menu items for recommendations
  const universalRecommendations = allMenuItems
    .filter(i => i.id !== item.id && i.popular)
    .slice(0, 4)
    .map(convertToUniversalFormat);

  // Create theme tokens from brand color
  const theme: ThemeTokens = {
    radius: 'rounded-2xl',
    shadow: 'shadow-2xl',
    brand: {
      bg: `bg-[${brandColor}]`,
      hover: `hover:opacity-90`,
    },
    accent: `text-[${brandColor}]`,
    chip: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
    },
    border: 'border border-gray-200',
  };

  const handleAddToCart = (payload: AddToCartPayload) => {
    // Convert new API payload format to legacy cart format
    addItem({
      sku: payload.item_id,
      name: item.name,
      price: payload.total_cents,
      priceUnit: normalizeUnit(item.unit || 'each'),
      unitLabel: item.unitLabel,
      qty: payload.qty,
      image: item.imageUrl || `https://source.unsplash.com/400x300/?${encodeURIComponent(item.image)}`,
      note: payload.notes,
    });
    
    // Toast handled by modal
    onClose();
  };

  const handleItemClick = (universalItem: UniversalMenuItem) => {
    // Find original item and call parent handler
    const originalItem = allMenuItems.find(i => i.id === universalItem.id);
    if (originalItem && onItemClick) {
      onItemClick(originalItem);
    }
  };

  return (
    <UniversalMenuItemModal
      isOpen={true}
      onClose={onClose}
      item={universalItem}
      theme={theme}
      onAddToCart={handleAddToCart}
      recommendedItems={universalRecommendations}
      onItemClick={handleItemClick}
    />
  );
};
