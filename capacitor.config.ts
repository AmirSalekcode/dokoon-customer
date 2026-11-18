import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android shell (Bazaar / Myket / direct APK). iPhone uses the PWA in phase 1.
 * appId = reversed domain (dokoonapp.ir → ir.dokoonapp.customer), decision D-52.
 * It can never change after the first store upload. Future apps: ir.dokoonapp.restaurant / .courier.
 */
const config: CapacitorConfig = {
  appId: 'ir.dokoonapp.customer',
  appName: 'دکون',
  webDir: 'dist',
  android: {
    // Payment gateways / deep links come later; keep mixed content off.
    allowMixedContent: false,
  },
};

export default config;
