import { useLanguage } from '../contexts/LanguageContext';

/**
 * Returns a resolver function that picks the correct localized name
 * based on the current UI language.
 *
 * Usage:
 *   const ln = useLocalizedName();
 *   ln(item.name_ar, item.name)   // → Arabic in AR mode, English in EN mode
 *   ln(item.customer_name, item.customer_name_en)  // same pattern
 */
export function useLocalizedName() {
  const { language } = useLanguage();

  return (nameAr?: string | null, nameEn?: string | null): string => {
    if (language === 'en' && nameEn && nameEn.trim()) {
      return nameEn;
    }
    return nameAr || nameEn || '';
  };
}
