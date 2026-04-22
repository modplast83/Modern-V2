// حدود المصنع (دائرة نصف قطرها 200 متر حول نقطة المركز)
export const FACTORY_CENTER = { lat: 24.774265, lng: 46.738586 };
export const FACTORY_RADIUS_METERS = 200;

export function isInsideFactory(lat: number, lng: number): boolean {
  // حساب المسافة بين نقطتين باستخدام صيغة هافرسين
  function toRad(x: number) {
    return (x * Math.PI) / 180;
  }
  const R = 6371000; // نصف قطر الأرض بالمتر
  const dLat = toRad(lat - FACTORY_CENTER.lat);
  const dLng = toRad(lng - FACTORY_CENTER.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(FACTORY_CENTER.lat)) *
      Math.cos(toRad(lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance <= FACTORY_RADIUS_METERS;
}
