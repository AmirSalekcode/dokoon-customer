import { create } from 'zustand';
import type { FoodHit, RestaurantCard } from '@/api/types';
import { normalizeDigits } from '@/lib/format';
import { readJson, writeJson } from '@/lib/storage';
import type { Filters } from './filters';

/** localStorage key for this device's recent searches (works for guests too, D-59). */
export const RECENT_KEY = 'dk-search-recent';
export const RECENT_MAX = 6;
/** Wait after the last keystroke before calling GET /search. */
export const SEARCH_DEBOUNCE_MS = 300;

/** Query as sent to the server: trimmed, single spaces, ASCII digits, Persian ی/ک. */
export function normalizeQuery(q: string): string {
  return normalizeDigits(q).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ').trim();
}

const SORTERS: Partial<Record<Filters['sort'], (r: RestaurantCard) => number>> = {
  rating: (r) => -(r.rating ?? 0),
  eta: (r) => r.etaMin ?? 0,
  fee: (r) => r.fee ?? 0,
  distance: (r) => r.distanceKm ?? 0,
};

function passes(r: RestaurantCard | undefined, f: Filters): boolean {
  if (!r) return false;
  if (f.openNow && !r.open) return false;
  if (f.hasDiscount && !r.offer) return false;
  if (f.minRating && (r.rating ?? 0) < f.minRating) return false;
  return true;
}

/**
 * GET /search takes only `q`/`lat`/`lng` (contract-notes #13), so the shared filters are applied
 * on the client to what the card carries. Tags are not on RestaurantCard and cannot be applied.
 */
export function filterRestaurants(list: RestaurantCard[], f: Filters): RestaurantCard[] {
  const kept = list.filter((r) => passes(r, f));
  const by = SORTERS[f.sort];
  return by ? [...kept].sort((a, b) => by(a) - by(b)) : kept;
}

export function filterFoods(hits: FoodHit[], f: Filters): FoodHit[] {
  const kept = hits.filter((h) => h.food && passes(h.restaurant, f));
  const by = SORTERS[f.sort];
  return by ? [...kept].sort((a, b) => by(a.restaurant!) - by(b.restaurant!)) : kept;
}

/** True when a filter is active that search results cannot honour (food-type tags). */
export function unsupportedFilters(f: Filters): boolean {
  return f.tags.length > 0;
}

/** Recent searches to show: this device's list, or the server's (`/search/suggestions`) until there is one. */
export function recentList(local: string[] | null, server: string[] | undefined): string[] {
  return local ?? server ?? [];
}

interface SearchState {
  /** Text in the search box; kept while the app runs so back / reopening shows it again. */
  query: string;
  /** null = this device has no list yet (fall back to the server's). */
  recent: string[] | null;
  setQuery: (q: string) => void;
  /** Save a query the user acted on (opened a result). `server` = the server's recent list. */
  remember: (q: string, server?: string[]) => void;
  clearRecent: () => void;
  reset: () => void;
}

const loadRecent = () => {
  const v = readJson<unknown>(RECENT_KEY, null);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null;
};

export const useSearch = create<SearchState>((set, get) => ({
  query: '',
  recent: loadRecent(),
  setQuery: (query) => set({ query }),
  remember: (q, server) => {
    const t = q.replace(/\s+/g, ' ').trim();
    if (!t) return;
    const base = recentList(get().recent, server);
    const recent = [t, ...base.filter((x) => x !== t)].slice(0, RECENT_MAX);
    writeJson(RECENT_KEY, recent);
    set({ recent });
  },
  clearRecent: () => {
    writeJson(RECENT_KEY, []);
    set({ recent: [] });
  },
  reset: () => set({ query: '', recent: loadRecent() }),
}));
