import { registerSW } from 'virtual:pwa-register';
import { isNative } from './lib/platform';
import { toast } from './ui/toast';

/**
 * Registers the Workbox service worker (PWA only; not inside the Capacitor shell, which ships
 * its assets locally). In mock mode the MSW worker owns the SW scope instead.
 */
export function registerPwa() {
  if (isNative() || !('serviceWorker' in navigator)) return;
  const update = registerSW({
    onNeedRefresh() {
      toast('نسخه‌ی جدید آماده است؛ برنامه به‌روزرسانی می‌شود');
      setTimeout(() => void update(true), 1500);
    },
    onOfflineReady() {
      toast('دکون برای استفاده‌ی آفلاین آماده شد');
    },
  });
}
