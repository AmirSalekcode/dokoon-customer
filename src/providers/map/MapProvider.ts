import type { LatLng } from '@/api/types';

export type MapProviderId = 'neshan' | 'balad';

export interface MapMountOptions {
  center: LatLng;
  zoom: number;
  /** Fired when the user moves the map / pin. We store coordinates only, never provider ids. */
  onCenterChange?: (c: LatLng) => void;
  dark?: boolean;
}

export interface MapHandle {
  setCenter(c: LatLng): void;
  getCenter(): LatLng;
  destroy(): void;
}

/**
 * Map abstraction (CLAUDE.md rule 9). Real Neshan / Balad SDK adapters will implement this after
 * their terms + API keys are verified. The user picks a provider; if it fails we fall back.
 */
export interface MapProvider {
  readonly id: MapProviderId;
  readonly title: string;
  /** Cheap check (script loads, key valid). Must not throw. */
  isAvailable(): Promise<boolean>;
  mount(el: HTMLElement, opts: MapMountOptions): Promise<MapHandle>;
  reverseGeocode?(p: LatLng): Promise<string | null>;
}

export class MapUnavailableError extends Error {
  constructor(readonly tried: MapProviderId[]) {
    super(`No map provider available (tried: ${tried.join(', ')})`);
    this.name = 'MapUnavailableError';
  }
}

/**
 * Mount the preferred provider; on failure try the others in order.
 * Returns the provider that actually worked so the UI can tell the user.
 */
export async function mountWithFallback(
  providers: MapProvider[],
  preferred: MapProviderId,
  el: HTMLElement,
  opts: MapMountOptions,
): Promise<{ provider: MapProvider; handle: MapHandle }> {
  const ordered = [...providers].sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred));
  const tried: MapProviderId[] = [];
  for (const provider of ordered) {
    tried.push(provider.id);
    try {
      if (!(await provider.isAvailable())) continue;
      const handle = await provider.mount(el, opts);
      return { provider, handle };
    } catch {
      /* try next provider */
    }
  }
  throw new MapUnavailableError(tried);
}
