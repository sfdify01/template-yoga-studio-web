/**
 * Dynamic pricing calculations for menu items
 */

import { UniversalMenuItem, Money, addMoney, multiplyMoney, toMoney } from './types';

export function calculateTotalPrice(
  item: UniversalMenuItem,
  selectedVariants: Record<string, string[]>,
  selectedAddons: Record<string, string[]>,
  quantity: number
): Money {
  let total = { ...item.basePrice };

  // Add variant price deltas
  if (item.variantGroups) {
    for (const group of item.variantGroups) {
      const selected = selectedVariants[group.id] || [];
      for (const choiceId of selected) {
        const choice = group.choices.find(c => c.id === choiceId);
        if (choice?.priceDeltaCents) {
          total = addMoney(total, toMoney(choice.priceDeltaCents, total.currency));
        }
      }
    }
  }

  // Add addon price deltas
  if (item.addonGroups) {
    for (const group of item.addonGroups) {
      const selected = selectedAddons[group.id] || [];
      for (const choiceId of selected) {
        const choice = group.choices.find(c => c.id === choiceId);
        if (choice?.priceDeltaCents) {
          total = addMoney(total, toMoney(choice.priceDeltaCents, total.currency));
        }
      }
    }
  }

  // Multiply by quantity
  return multiplyMoney(total, quantity);
}

export function getChoicePriceText(priceDeltaCents?: number): string | null {
  if (!priceDeltaCents || priceDeltaCents === 0) return null;
  
  const sign = priceDeltaCents > 0 ? '+' : '';
  const amount = Math.abs(priceDeltaCents) / 100;
  
  return `${sign}$${amount.toFixed(2)}`;
}
