import type { CanonicalPriceUnit, PriceUnit } from '../atoms/cart';

type UnitConfig = {
  unit: CanonicalPriceUnit;
  isWeight: boolean;
  decimals: number;
  step: number;
  min: number;
  priceSuffix: string;
  ariaSuffix: string;
  quantityLabel: string;
  quantitySuffix: string;
};

const DEFAULT_UNIT: CanonicalPriceUnit = 'each';

const UNIT_ALIASES: Record<string, CanonicalPriceUnit> = {
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  floz: 'oz',
  'fl oz': 'oz',
  'fluidounce': 'oz',
  each: 'each',
  pack: 'pack',
  dozen: 'dozen',
  kg: 'kg',
  g: 'g',
  l: 'l',
  liter: 'l',
  litres: 'l',
  litre: 'l',
  liters: 'l',
  ltr: 'l',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
};

const UNIT_CONFIG: Record<CanonicalPriceUnit, UnitConfig> = {
  lb: {
    unit: 'lb',
    isWeight: true,
    decimals: 2,
    step: 0.25,
    min: 0.25,
    priceSuffix: '/lb',
    ariaSuffix: 'per pound',
    quantityLabel: 'Weight (lb)',
    quantitySuffix: 'lb',
  },
  oz: {
    unit: 'oz',
    isWeight: true,
    decimals: 2,
    step: 4, // quarter-pound equivalent
    min: 4,
    priceSuffix: '/oz',
    ariaSuffix: 'per ounce',
    quantityLabel: 'Weight (oz)',
    quantitySuffix: 'oz',
  },
  kg: {
    unit: 'kg',
    isWeight: true,
    decimals: 2,
    step: 0.5,
    min: 1,
    priceSuffix: '/kg',
    ariaSuffix: 'per kilogram',
    quantityLabel: 'Weight (kg)',
    quantitySuffix: 'kg',
  },
  g: {
    unit: 'g',
    isWeight: true,
    decimals: 0,
    step: 50,
    min: 50,
    priceSuffix: '/g',
    ariaSuffix: 'per gram',
    quantityLabel: 'Weight (g)',
    quantitySuffix: 'g',
  },
  each: {
    unit: 'each',
    isWeight: false,
    decimals: 0,
    step: 1,
    min: 1,
    priceSuffix: 'each',
    ariaSuffix: 'each',
    quantityLabel: 'Quantity',
    quantitySuffix: '',
  },
  pack: {
    unit: 'pack',
    isWeight: false,
    decimals: 0,
    step: 1,
    min: 1,
    priceSuffix: 'per pack',
    ariaSuffix: 'per pack',
    quantityLabel: 'Packs',
    quantitySuffix: 'pack',
  },
  dozen: {
    unit: 'dozen',
    isWeight: false,
    decimals: 0,
    step: 1,
    min: 1,
    priceSuffix: 'per dozen',
    ariaSuffix: 'per dozen',
    quantityLabel: 'Dozens',
    quantitySuffix: 'dozen',
  },
  l: {
    unit: 'l',
    isWeight: true,
    decimals: 2,
    step: 0.5,
    min: 1,
    priceSuffix: '/L',
    ariaSuffix: 'per liter',
    quantityLabel: 'Volume (L)',
    quantitySuffix: 'L',
  },
  ml: {
    unit: 'ml',
    isWeight: true,
    decimals: 0,
    step: 50,
    min: 50,
    priceSuffix: '/mL',
    ariaSuffix: 'per milliliter',
    quantityLabel: 'Volume (mL)',
    quantitySuffix: 'mL',
  },
};

const trimZeros = (value: string) => {
  if (!value.includes('.')) return value;
  return value
    .replace(/\.0+$/, '')
    .replace(/(\.[0-9]*?)0+$/, '$1')
    .replace(/\.$/, '');
};

export function normalizeUnit(unit?: string | null): CanonicalPriceUnit {
  if (!unit) return DEFAULT_UNIT;
  const cleaned = unit.trim().toLowerCase().replace(/\./g, '');
  const collapsed = cleaned.replace(/\s+/g, '');

  if (UNIT_ALIASES[cleaned]) return UNIT_ALIASES[cleaned];
  if (UNIT_ALIASES[collapsed]) return UNIT_ALIASES[collapsed];
  if ((cleaned as CanonicalPriceUnit) in UNIT_CONFIG) {
    return cleaned as CanonicalPriceUnit;
  }

  return DEFAULT_UNIT;
}

const getConfig = (unit?: string | null): UnitConfig => {
  const normalized = normalizeUnit(unit);
  return UNIT_CONFIG[normalized] ?? UNIT_CONFIG[DEFAULT_UNIT];
};

export const getUnitConfig = (unit?: string | null): UnitConfig => getConfig(unit);

export function isWeightUnit(unit?: string | null): boolean {
  return getConfig(unit).isWeight;
}

export function getUnitStep(unit?: string | null): number {
  return getConfig(unit).step;
}

export function getUnitMinimum(unit?: string | null): number {
  return getConfig(unit).min;
}

export function formatUnitSuffix(
  unit?: string | null,
  unitLabel?: string | null
): string {
  const config = getConfig(unit);

  if (unitLabel && unitLabel.trim()) {
    const trimmedLabel = unitLabel.trim();
    // If label matches the unit name (e.g. "lb" == "lb"), prefer the config suffix
    // This ensures we get "/lb" instead of "lb"
    if (trimmedLabel.toLowerCase() === config.unit.toLowerCase()) {
      return config.priceSuffix;
    }
    return trimmedLabel;
  }
  return config.priceSuffix;
}

export function formatUnitAriaSuffix(
  unit?: string | null,
  unitLabel?: string | null
): string {
  const config = getConfig(unit);

  if (unitLabel && unitLabel.trim()) {
    const trimmedLabel = unitLabel.trim();
    // If label matches the unit name, prefer the config aria suffix
    // This ensures we get "per pound" instead of "lb"
    if (trimmedLabel.toLowerCase() === config.unit.toLowerCase()) {
      return config.ariaSuffix;
    }
    return trimmedLabel;
  }
  return config.ariaSuffix;
}

export function getQuantityLabel(unit?: string | null): string {
  const config = getConfig(unit);
  return config.quantityLabel;
}

export function formatQuantityValue(value: number, unit?: string | null): string {
  const config = getConfig(unit);
  if (config.isWeight) {
    return trimZeros(value.toFixed(config.decimals));
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return trimZeros(value.toFixed(2));
}

export function formatQuantityDisplay(
  value: number,
  unit?: string | null
): string {
  const config = getConfig(unit);
  const formatted = formatQuantityValue(value, unit);
  if (config.isWeight) {
    return `${formatted} ${config.quantitySuffix}`.trim();
  }
  return config.quantitySuffix
    ? `${formatted} ${config.quantitySuffix}`.trim()
    : formatted;
}

export function getUnitDecimals(unit?: string | null): number {
  return getConfig(unit).decimals;
}

export function getUnitQuantitySuffix(unit?: string | null): string {
  return getConfig(unit).quantitySuffix;
}

export function formatQuantityForUber(
  quantity: number,
  unit?: string | null
): {
  quantity: number;
  descriptionSuffix?: string;
  unit: CanonicalPriceUnit;
  quantityDisplay: string;
  rawQuantity: number;
  isWeightBased: boolean;
} {
  const normalizedUnit = normalizeUnit(unit);
  const config = getConfig(normalizedUnit);
  const quantityDisplay = formatQuantityDisplay(quantity, normalizedUnit);

  if (config.isWeight) {
    // For weight items, we'll send quantity 1 and append weight to description
    // because Uber Direct might expect integer quantities.
    return {
      quantity: 1,
      rawQuantity: Number(quantity.toFixed(config.decimals)),
      descriptionSuffix: `(${quantityDisplay})`,
      unit: normalizedUnit,
      quantityDisplay,
      isWeightBased: true,
    };
  }

  // For non-weight items, use the quantity as is, ensuring it's at least 1
  return {
    quantity: Math.max(1, Math.ceil(quantity)),
    rawQuantity: Math.max(1, Math.ceil(quantity)),
    descriptionSuffix: undefined,
    unit: normalizedUnit,
    quantityDisplay,
    isWeightBased: false,
  };
}
