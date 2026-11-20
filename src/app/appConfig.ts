import { api } from '@/api/client';

/** What `GET /app/config` can force at startup (contract AppConfig.minVersion / .maintenance). */
export type ConfigBlock = 'update' | 'maintenance' | null;

interface AppConfigLike {
  minVersion?: string;
  maintenance?: boolean;
}

const parts = (v: string): number[] | null => {
  if (!/^\d+(\.\d+)*$/.test(v.trim())) return null;
  return v.trim().split('.').map(Number);
};

/** True when `current` < `min` (dotted numeric versions; missing parts = 0). Malformed min never blocks. */
export function isOlderVersion(current: string, min: string): boolean {
  const a = parts(current);
  const b = parts(min);
  if (!a || !b) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

/** Pure decision (unit-tested). An app that is too old must update even during maintenance. */
export function blockFor(cfg: AppConfigLike | undefined, appVersion: string): ConfigBlock {
  if (!cfg) return null;
  if (cfg.minVersion && isOlderVersion(appVersion, cfg.minVersion)) return 'update';
  if (cfg.maintenance) return 'maintenance';
  return null;
}

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
