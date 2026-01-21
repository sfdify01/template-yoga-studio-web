import type { CartItem } from '../../atoms/cart';
import type { PaymentIntentOrderItem } from './types';
import { formatQuantityDisplay, normalizeUnit } from '../units';

const MAX_ORDER_ITEMS = 25;
const MAX_SUMMARY_LENGTH = 600;
const MAX_NOTE_LENGTH = 120;

export function buildOrderItemsMetadata(items: CartItem[]): PaymentIntentOrderItem[] {
  return items.slice(0, MAX_ORDER_ITEMS).map((item) => {
    const unit = normalizeUnit(item.priceUnit);
    return {
      sku: item.sku,
      name: item.name,
      qty: item.qty,
      unit,
      unitLabel: item.unitLabel,
      quantityDisplay: formatQuantityDisplay(item.qty, unit),
      unitPriceCents: item.price,
      totalPriceCents: item.price * item.qty,
      modifiers: item.mods?.map((mod) => mod.name).filter(Boolean),
      note: item.note ? item.note.slice(0, MAX_NOTE_LENGTH) : undefined,
    };
  });
}

export function buildOrderItemsSummary(items: CartItem[]): string {
  const summary = buildOrderItemsMetadata(items)
    .map((item) => {
      const quantityText = item.quantityDisplay || `${item.qty}×`;
      return `${quantityText} ${item.name}`.trim();
    })
    .join(', ');

  return summary.slice(0, MAX_SUMMARY_LENGTH);
}
