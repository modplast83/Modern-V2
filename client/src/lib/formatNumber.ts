/**
 * تنسيق الأرقام لإزالة الفاصلة العشرية للأرقام الصحيحة
 * Format numbers to remove decimal places for whole numbers
 */
export function formatNumber(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") {
    return "0";
  }

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) {
    return "0";
  }

  // عرض الرقم مع فاصلة الآلاف، وبكسور عشرية محدودة (حتى منزلتين) عند الحاجة
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/**
 * تنسيق الأرقام مع فواصل الآلاف
 * Format numbers with thousands separators
 */
export function formatNumberWithCommas(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") {
    return "0";
  }

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) {
    return "0";
  }

  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/**
 * تنسيق الأوزان (كيلوغرام)
 * Format weights (kilograms)
 */
export function formatWeight(
  value: number | string | null | undefined,
): string {
  return formatNumber(value) + " كغ";
}

/**
 * تنسيق الأبعاد (سم)
 * Format dimensions (centimeters)
 */
export function formatDimension(
  value: number | string | null | undefined,
): string {
  return formatNumber(value) + " سم";
}

/**
 * تنسيق السماكة (ميكرون)
 * Format thickness (microns)
 */
export function formatThickness(
  value: number | string | null | undefined,
): string {
  return formatNumber(value) + " ميكرون";
}

/**
 * تنسيق النسب المئوية
 * Format percentages
 */
export function formatPercentage(
  value: number | string | null | undefined,
): string {
  return formatNumber(value) + "%";
}
