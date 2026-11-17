import type { LatLng } from '@/api/types';
import type { MapHandle, MapMountOptions, MapProvider, MapProviderId } from './MapProvider';

/**
 * Fake map used until Neshan/Balad keys are approved. Renders nothing itself (MapPicker draws the
 * illustrated placeholder); it only tracks the center so flows and tests work end-to-end.
 */
export function createFakeMapProvider(
  id: MapProviderId,
  opts: { available?: boolean; failMount?: boolean } = {},
): MapProvider {
  return {
    id,
    title: id === 'neshan' ? 'نشان' : 'بلد',
    isAvailable: async () => opts.available ?? true,
    mount: async (el: HTMLElement, m: MapMountOptions): Promise<MapHandle> => {
      if (opts.failMount) throw new Error(`${id} failed to load`);
      let center: LatLng = m.center;
      el.dataset.mapProvider = id;
      return {
        setCenter: (c) => {
          center = c;
          m.onCenterChange?.(c);
        },
        getCenter: () => center,
        destroy: () => {
          delete el.dataset.mapProvider;
        },
      };
    },
    reverseGeocode: async () => null,
  };
}

export const mapProviders: MapProvider[] = [createFakeMapProvider('neshan'), createFakeMapProvider('balad')];
