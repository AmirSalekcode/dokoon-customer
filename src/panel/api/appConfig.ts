import { blockFor, type ConfigBlock } from '@/lib/appVersion';
import type { PanelApi } from './client';

/**
 * Startup check (D-106): maintenance / forced update from the shared `GET /app/config`
 * (customer contract; per-app fields proposed in contract-notes 22). It is not in the restaurant
 * contract, so it is fetched through the same HTTP layer without generated types.
 * A failing request never blocks the panel; its own requests show the right ErrorPage.
 */
export async function checkPanelConfig(api: PanelApi, appVersion: string): Promise<ConfigBlock> {
  try {
    const { data } = await (api.GET as unknown as (p: string) => Promise<{ data?: unknown }>)('/app/config');
    return blockFor(data as { minVersion?: string; maintenance?: boolean } | undefined, appVersion);
  } catch {
    return null;
  }
}
