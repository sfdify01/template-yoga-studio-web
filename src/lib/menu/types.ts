/**
 * Universal Menu Item Types
 * Production-ready data contracts for white-label food ordering
 */

export type Money = {
  amountCents: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | string;
};

export type Choice = {
  id: string;
  label: string;
  priceDeltaCents?: number;
  default?: boolean;
  soldOut?: boolean;
  description?: string;
};

export type GroupType = 'single' | 'multi';

export type VariantGroup = {
  id: string;
  title: string;
  type: GroupType;
  required?: boolean;
  min?: number;
  max?: number;
  choices: Choice[];
};

export type Badge = {
  id: string;
  label: string;
  icon?: string;
  tone: 'success' | 'warning' | 'info' | 'danger' | 'neutral';
};

export type Nutrition = {
  calories?: number;
  protein?: string;
  carbs?: string;
  fat?: string;
  fiber?: string;
  sodium?: string;
  sugar?: string;
};

export type UniversalMenuItem = {
  id: string;
  name: string;
  description?: string;
  basePrice: Money;
  imageUrl?: string;
  tags?: Badge[];
  variantGroups?: VariantGroup[];
  addonGroups?: VariantGroup[];
  notesPlaceholder?: string;
  nutrition?: Nutrition;
  allergens?: string[];
  recommendations?: string[];
  soldOut?: boolean;
};

export type ThemeTokens = {
  radius: string;
  shadow: string;
  brand: {
    bg: string;
    hover: string;
    text?: string;
  };
  accent: string;
  chip: {
    bg: string;
    text: string;
  };
  border: string;
  spacing?: {
    section?: string;
    item?: string;
  };
};

export type CartPayload = {
  itemId: string;
  name: string;
  quantity: number;
  basePrice: Money;
  selectedVariants: Record<string, string[]>; // groupId -> choiceIds
  selectedAddons: Record<string, string[]>;
  specialNotes?: string;
  totalPrice: Money;
  imageUrl?: string;
};

export type ValidationError = {
  groupId: string;
  message: string;
};

export type SelectionState = {
  variants: Record<string, string[]>;
  addons: Record<string, string[]>;
  quantity: number;
  notes: string;
};

/**
 * Helper to format money
 */
export function formatMoney(money: Money): string {
  const amount = money.amountCents / 100;
  const symbol = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
  }[money.currency] || money.currency;

  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Helper to create money object
 */
export function toMoney(cents: number, currency: string = 'USD'): Money {
  return { amountCents: cents, currency };
}

/**
 * Helper to add money values
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error('Cannot add money with different currencies');
  }
  return {
    amountCents: a.amountCents + b.amountCents,
    currency: a.currency,
  };
}

/**
 * Helper to multiply money by quantity
 */
export function multiplyMoney(money: Money, multiplier: number): Money {
  return {
    amountCents: Math.round(money.amountCents * multiplier),
    currency: money.currency,
  };
}
