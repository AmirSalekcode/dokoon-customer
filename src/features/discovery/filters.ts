import { create } from 'zustand';

/** Sort values from the contract (GET /restaurants `sort`). */
export type SortKey = 'recommended' | 'rating' | 'eta' | 'fee' | 'distance';

export interface Filters {
  sort: SortKey;
  openNow: boolean;
  hasDiscount: boolean;
  tags: string[];
  minRating: number | null;
}

export const DEFAULT_FILTERS: Filters = {
  sort: 'recommended',
  openNow: false,
  hasDiscount: false,
  tags: [],
  minRating: null,
};

export function activeCount(f: Filters): number {
  return (
    (f.sort !== 'recommended' ? 1 : 0) +
    (f.openNow ? 1 : 0) +
    (f.hasDiscount ? 1 : 0) +
    f.tags.length +
    (f.minRating ? 1 : 0)
  );
}

/** Query for GET /restaurants — only values that narrow or order the list. */
export function toQuery(category: string, f: Filters) {
  return {
    ...(category !== 'all' ? { category } : {}),
    sort: f.sort,
    ...(f.openNow ? { openNow: true } : {}),
    ...(f.hasDiscount ? { hasDiscount: true } : {}),
    ...(f.tags.length ? { tags: f.tags } : {}),
    ...(f.minRating ? { minRating: f.minRating } : {}),
  };
}

interface DiscoveryState {
  category: string;
  applied: Filters;
  /** What the FilterSheet edits; applied only on «اعمال». */
  draft: Filters;
  setCategory: (c: string) => void;
  openDraft: () => void;
  editDraft: (p: Partial<Filters>) => void;
  toggleTag: (t: string) => void;
  clearDraft: () => void;
  applyDraft: () => void;
  reset: () => void;
  /** Home shows its curated sections only when nothing narrows the list. */
  isBrowsing: () => boolean;
}

/** Shared discovery state (Home and Restaurants tab use the same FilterSheet — screen-specs §2). */
export const useDiscovery = create<DiscoveryState>((set, get) => ({
  category: 'all',
  applied: DEFAULT_FILTERS,
  draft: DEFAULT_FILTERS,
  setCategory: (category) => set({ category }),
  openDraft: () => set({ draft: get().applied }),
  editDraft: (p) => set({ draft: { ...get().draft, ...p } }),
  toggleTag: (t) => {
    const tags = get().draft.tags;
    set({ draft: { ...get().draft, tags: tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t] } });
  },
  clearDraft: () => set({ draft: DEFAULT_FILTERS }),
  applyDraft: () => set({ applied: get().draft }),
  reset: () => set({ category: 'all', applied: DEFAULT_FILTERS, draft: DEFAULT_FILTERS }),
  isBrowsing: () => get().category === 'all' && activeCount(get().applied) === 0,
}));
