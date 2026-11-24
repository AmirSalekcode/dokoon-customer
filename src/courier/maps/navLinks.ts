import type { MapProviderId } from '@/providers/map/MapProvider';

/**
 * Turn-by-turn navigation in the courier's own map app (KAN-96, courier rule 8): the courier picks Neshan or
 * Balad; if that one cannot be opened, the other is tried. We store and send places, never provider ids.
 *
 * NOT VERIFIED: neither provider publishes a deep-link format we could confirm (rule 9: verify terms/keys
 * before relying on them). The link shapes live only here so they can be corrected in one place once the
 * owner confirms them with Neshan/Balad. `ActiveOrder` has no coordinates yet (contract-notes 36), so links
 * search by address; with coordinates they open the point itself.
 */
export interface NavPlace {
  /** Full address, as the server sent it. */
  address: string;
  lat?: number;
  lng?: number;
}

export const NAV_LINKS: Record<MapProviderId, { point: (lat: number, lng: number) => string; search: (q: string) => string }> =
  {
    neshan: {
      point: (lat, lng) => `https://neshan.org/maps/@${lat},${lng},16z`,
      search: (q) => `https://neshan.org/maps/search/${encodeURIComponent(q)}`,
    },
    balad: {
      point: (lat, lng) => `https://balad.ir/location?latitude=${lat}&longitude=${lng}&zoom=16`,
      search: (q) => `https://balad.ir/search?query=${encodeURIComponent(q)}`,
    },
  };

export const navUrl = (provider: MapProviderId, place: NavPlace): string => {
  const links = NAV_LINKS[provider];
  return typeof place.lat === 'number' && typeof place.lng === 'number'
    ? links.point(place.lat, place.lng)
    : links.search(place.address);
};

const other = (p: MapProviderId): MapProviderId => (p === 'neshan' ? 'balad' : 'neshan');

/**
 * Opens a link; false when it could not be opened at all. In a browser that only shows as an exception
 * (`noopener` makes `window.open` return null even on success); the Android app (KAN-104) can tell when no
 * app handles the link and pass its own opener.
 */
export type Opener = (url: string) => boolean;
const browserOpener: Opener = (url) => {
  try {
    window.open(url, '_blank', 'noopener');
    return true;
  } catch {
    return false;
  }
};

/**
 * Open the picked provider; when it cannot be opened at all, the other one. Returns the provider that was
 * opened, or null (the screen then offers «کپی آدرس»).
 */
export function openNavigation(
  provider: MapProviderId,
  place: NavPlace,
  open: Opener = browserOpener,
): MapProviderId | null {
  if (!place.address && typeof place.lat !== 'number') return null;
  if (open(navUrl(provider, place))) return provider;
  const alt = other(provider);
  return open(navUrl(alt, place)) ? alt : null;
}
