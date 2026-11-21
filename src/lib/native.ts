import { registerPlugin } from '@capacitor/core';

/**
 * Dokoon's own Android plugin (KAN-72): native-android/dokoon-plugins/DokoonNativePlugin.java, registered by
 * both apps. Only call it when `isNative()`; on the web every method is unimplemented.
 */
export interface DokoonNativePlugin {
  /** Keystore-encrypted value, or null (absent or no longer decryptable). */
  secureGet(o: { key: string }): Promise<{ value: string | null }>;
  secureSet(o: { key: string; value: string }): Promise<void>;
  secureRemove(o: { key: string }): Promise<void>;
  /** FLAG_KEEP_SCREEN_ON on the activity window. */
  keepAwake(o: { on: boolean }): Promise<{ ok: boolean }>;
  /** Vibration pattern in ms (on, off, on…); all zeros cancels. */
  vibrate(o: { pattern: number[] }): Promise<{ ok: boolean }>;
  /** Android 13+ asks once; resolves whether notifications are allowed. */
  requestNotifications(): Promise<{ granted: boolean }>;
  /** Local notification on the «سفارش جدید» channel (alert sound); tap opens the order. */
  notifyOrder(o: { id: string; title: string; body: string }): Promise<{ shown: boolean }>;
  cancelOrder(o: { id: string }): Promise<void>;
  /** Writes the file to the app cache and opens the system share sheet (KAN-75). name: [A-Za-z0-9._-]. */
  shareFile(o: { name: string; base64: string; mime: string; title?: string }): Promise<{ shared: boolean }>;
}

export const DokoonNative = registerPlugin<DokoonNativePlugin>('DokoonNative');
