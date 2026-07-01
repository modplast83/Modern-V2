/**
 * Decimal handling utilities for consistent number processing
 * between frontend, backend, and database layers
 */

/**
 * Convert a valid number to a properly formatted decimal string for database storage
 * @param value - The number to convert (must be valid)
 * @param precision - Number of decimal places (default: 3)
 * @returns Formatted decimal string
 * @throws Error if value is invalid
 */
export function toDecimalString(
  value: number | string,
  precision: number = 3,
): string {
  if (value === null || value === undefined || value === "") {
    throw new Error("قيمة فارغة أو غير محددة - لا يمكن تحويلها إلى رقم عشري");
  }

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) {
    throw new Error("قيمة غير صحيحة - لا يمكن تحويلها إلى رقم عشري");
  }

  if (num < 0) {
    throw new Error("القيمة يجب أن تكون موجبة");
  }

  return num.toFixed(precision);
}

/**
 * Convert a number to decimal string with safe fallback (for backwards compatibility)
 * @param value - The number to convert
 * @param precision - Number of decimal places (default: 3)
 * @returns Formatted decimal string or '0' for invalid values
 */
export function toDecimalStringSafe(
  value: number | string | null | undefined,
  precision: number = 3,
): string {
  if (value === null || value === undefined || value === "") {
    return "0";
  }

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) {
    return "0";
  }

  return num.toFixed(precision);
}

/**
 * Validate and normalize decimal values for database insertion
 * @param value - The value to normalize
 * @param maxValue - Maximum allowed value
 * @param precision - Decimal precision (default: 3)
 * @returns Normalized decimal number
 */
export function normalizeDecimal(
  value: number | string,
  maxValue: number = 100000,
  precision: number = 3,
): number {
  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num) || num < 0) {
    throw new Error("القيمة يجب أن تكون رقماً موجباً");
  }

  if (num > maxValue) {
    throw new Error("القيمة تتجاوز الحد الأقصى المسموح");
  }

  return Number(num.toFixed(precision));
}

/**
 * Strictly parse decimal values from strings or numbers
 * @param value - Value to parse
 * @returns Parsed decimal number
 * @throws Error if value is invalid
 */
export function parseDecimal(value: any): number {
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  throw new Error(`قيمة غير صحيحة: ${value} - لا يمكن تحويلها إلى رقم`);
}

/**
 * Safely parse decimal values with fallback (for backwards compatibility)
 * @param value - Value to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed decimal number
 */
export function parseDecimalSafe(value: any, defaultValue: number = 0): number {
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  return defaultValue;
}

/**
 * Format decimal for display with proper Arabic number formatting
 * @param value - Value to format
 * @param precision - Decimal places to show
 * @param removeTrailingZeros - Whether to remove trailing zeros
 * @returns Formatted string
 */
export function formatDecimalDisplay(
  value: number | string | null | undefined,
  precision: number = 3,
  removeTrailingZeros: boolean = true,
): string {
  const num = parseDecimalSafe(value, 0);

  if (num === 0) {
    return "0";
  }

  let formatted = num.toFixed(precision);

  if (removeTrailingZeros) {
    formatted = formatted.replace(/\.?0+$/, "");
  }

  return formatted;
}

/**
 * Check if a decimal value is within valid bounds
 * @param value - Value to check
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns true if valid, false otherwise
 */
export function isValidDecimal(
  value: any,
  min: number = 0,
  max: number = 100000,
): boolean {
  try {
    const num = parseDecimal(value);
    return num >= min && num <= max;
  } catch {
    return false;
  }
}

/**
 * Convert weight values specifically (3 decimal places)
 * @param value - Weight value to convert
 * @returns Normalized weight as number
 */
export function normalizeWeight(value: number | string): number {
  return normalizeDecimal(value, 50000, 3); // 50 tons max weight
}

/**
 * Convert percentage values specifically (2 decimal places)
 * @param value - Percentage value to convert
 * @returns Normalized percentage as number
 */
export function normalizePercentage(value: number | string): number {
  return normalizeDecimal(value, 100, 2); // 100% max
}

/**
 * Convert number to decimal string for database storage (strict validation)
 * @param value - Validated number to convert
 * @param precision - Decimal places
 * @returns Decimal string for database
 */
export function numberToDecimalString(
  value: number,
  precision: number = 3,
): string {
  if (typeof value !== "number" || isNaN(value) || value < 0) {
    throw new Error(`قيمة رقمية غير صحيحة: ${value}`);
  }
  return value.toFixed(precision);
}

export default {
  toDecimalString,
  toDecimalStringSafe,
  normalizeDecimal,
  parseDecimal,
  parseDecimalSafe,
  formatDecimalDisplay,
  isValidDecimal,
  normalizeWeight,
  normalizePercentage,
  numberToDecimalString,
};
