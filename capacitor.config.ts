import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android shell (Bazaar / Myket / direct APK). iPhone uses the PWA in phase 1.
 * appId follows the kickoff suggestion `ir.dokoon.customer` — confirm before the first store upload
 * (it cannot be changed after publishing).
 */
const config: CapacitorConfig = {
  appId: 'ir.dokoon.customer',
  appName: 'دکون',
  webDir: 'dist',
  android: {
    // Payment gateways / deep links come later; keep mixed content off.
    allowMixedContent: false,
  },
};

export default config;
