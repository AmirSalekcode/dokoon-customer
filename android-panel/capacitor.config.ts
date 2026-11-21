import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Restaurant panel Android shell (KAN-71, D-92): its own Capacitor project next to the customer one.
 * appId = reversed domain (panel of dokoonapp.ir → ir.dokoonapp.restaurant, D-52). It can never change
 * after the first store upload (guarded by src/test/android-panel-id.test.ts).
 * Commands run from this folder: `npm run android:panel:debug` at the repo root.
 */
const config: CapacitorConfig = {
  appId: 'ir.dokoonapp.restaurant',
  appName: 'دکون رستوران',
  webDir: '../dist-panel',
  android: {
    allowMixedContent: false,
  },
};

export default config;
