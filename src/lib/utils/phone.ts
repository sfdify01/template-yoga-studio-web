const DIGIT_REGEX = /\D/g;

const stripToDigits = (value: string): string => value.replace(DIGIT_REGEX, '');

const limitDigits = (digits: string): string => {
  if (!digits) return '';
  if (digits.startsWith('1')) {
    return digits.slice(0, 11);
  }
  return digits.slice(0, 10);
};

export const formatNorthAmericanPhoneForDisplay = (value: string): string => {
  const digitsOnly = stripToDigits(value);
  if (!digitsOnly) return '';

  const hasCountryCode = digitsOnly.length > 10 && digitsOnly.startsWith('1');
  const localDigits = hasCountryCode ? digitsOnly.slice(1) : digitsOnly;

  const area = localDigits.slice(0, 3);
  const central = localDigits.slice(3, 6);
  const line = localDigits.slice(6, 10);

  let formatted = '';
  if (area) {
    if (area.length < 3) {
      formatted = area;
    } else {
      formatted = `(${area})`;
    }
  }
  if (central) {
    formatted += area.length === 3 ? ` ${central}` : central;
  }
  if (line) {
    formatted += `-${line}`;
  }

  if (!formatted) {
    formatted = localDigits;
  }

  return hasCountryCode ? `+1 ${formatted}` : formatted;
};

export const sanitizeNorthAmericanPhoneInput = (raw: string): {
  digits: string;
  formatted: string;
} => {
  const digits = limitDigits(stripToDigits(raw));
  return {
    digits,
    formatted: formatNorthAmericanPhoneForDisplay(digits),
  };
};

export const toE164PhoneNumber = (value: string): string | null => {
  const digitsOnly = stripToDigits(value);
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  return null;
};

export const isValidNorthAmericanPhone = (value: string): boolean => {
  const digitsOnly = stripToDigits(value);
  if (digitsOnly.length === 10) return true;
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) return true;
  return false;
};
