import { api } from '@/api/client';
import { blockFor, type ConfigBlock } from '@/lib/appVersion';

export { blockFor, isOlderVersion, type ConfigBlock } from '@/lib/appVersion';

/**
 * Startup check, run by the splash in parallel with the session check (no extra delay).
 * A failing request never blocks the app: the screens' own requests will show the right ErrorPage.
 */
export async function checkAppConfig(): Promise<ConfigBlock> {
  try {
    const { data } = await api.GET('/app/config');
    return blockFor(data, __APP_VERSION__);
  } catch {
    return null;
  }
}
