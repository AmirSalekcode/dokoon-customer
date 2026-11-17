import { Capacitor } from '@capacitor/core';

export type Platform = 'android' | 'ios-pwa' | 'web';

export const isNative = () => Capacitor.isNativePlatform();

export function currentPlatform(): Platform {
  if (Capacitor.getPlatform() === 'android') return 'android';
  const standalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const ios = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  return ios && standalone ? 'ios-pwa' : 'web';
}
