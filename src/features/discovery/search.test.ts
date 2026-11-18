import { beforeEach, describe, expect, it } from 'vitest';
import type { FoodHit, RestaurantCard } from '@/api/types';
import { DEFAULT_FILTERS } from './filters';
import {
  RECENT_KEY,
  RECENT_MAX,
  filterFoods,
  filterRestaurants,
  normalizeQuery,
  recentList,
  unsupportedFilters,
  useSearch,
} from './search';

const r = (id: string, p: Partial<RestaurantCard> = {}): RestaurantCard => ({
  id,
  name: id,
  open: true,
  rating: 4,
  etaMin: 20,
  fee: 10000,
  distanceKm: 2,
  ...p,
});

beforeEach(() => {
  localStorage.clear();
  useSearch.getState().reset();
});

describe('normalizeQuery', () => {
  it('trims, collapses spaces and maps Arabic letters and digits', () => {
    expect(normalizeQuery('  كباب   ي ۲  ')).toBe('کباب ی 2');
    expect(normalizeQuery('   ')).toBe('');
  });
});

describe('filterRestaurants (filters /search cannot take yet)', () => {
  const list = [
    r('a', { open: false, rating: 4.8, etaMin: 40 }),
    r('b', { offer: '۲۰٪', rating: 4.2, etaMin: 15 }),
    r('c', { rating: 3.9, etaMin: 30 }),
  ];

  it('keeps server order with default filters', () => {
    expect(filterRestaurants(list, DEFAULT_FILTERS).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('applies openNow, hasDiscount and minRating', () => {
    expect(filterRestaurants(list, { ...DEFAULT_FILTERS, openNow: true }).map((x) => x.id)).toEqual([
      'b',
      'c',
    ]);
    expect(filterRestaurants(list, { ...DEFAULT_FILTERS, hasDiscount: true }).map((x) => x.id)).toEqual([
      'b',
    ]);
    expect(filterRestaurants(list, { ...DEFAULT_FILTERS, minRating: 4 }).map((x) => x.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('sorts by rating and eta', () => {
    expect(filterRestaurants(list, { ...DEFAULT_FILTERS, sort: 'rating' }).map((x) => x.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(filterRestaurants(list, { ...DEFAULT_FILTERS, sort: 'eta' }).map((x) => x.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('food hits follow their restaurant', () => {
    const hits: FoodHit[] = [
      { food: { id: 'f1', title: 'کباب' }, restaurant: list[0] },
      { food: { id: 'f2', title: 'برگر' }, restaurant: list[1] },
    ];
    expect(filterFoods(hits, { ...DEFAULT_FILTERS, openNow: true }).map((h) => h.food!.id)).toEqual(['f2']);
  });

  it('reports tags as not supported by search', () => {
    expect(unsupportedFilters(DEFAULT_FILTERS)).toBe(false);
    expect(unsupportedFilters({ ...DEFAULT_FILTERS, tags: ['kebab'] })).toBe(true);
  });
});

describe('useSearch (query + recent searches)', () => {
  it('keeps the query across visits', () => {
    useSearch.getState().setQuery('کباب');
    expect(useSearch.getState().query).toBe('کباب');
  });

  it('recent falls back to the server list until the user has their own', () => {
    expect(recentList(useSearch.getState().recent, ['پیتزا'])).toEqual(['پیتزا']);
    useSearch.getState().remember('برگر', ['پیتزا']);
    expect(recentList(useSearch.getState().recent, ['پیتزا'])).toEqual(['برگر', 'پیتزا']);
    expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toEqual(['برگر', 'پیتزا']);
  });

  it('dedupes, moves the latest first and keeps at most RECENT_MAX', () => {
    for (const q of ['۱', '۲', '۳', '۴', '۵', '۶', '۷']) useSearch.getState().remember(q, []);
    useSearch.getState().remember('۳', []);
    const list = recentList(useSearch.getState().recent, []);
    expect(list).toHaveLength(RECENT_MAX);
    expect(list[0]).toBe('۳');
    expect(list.filter((x) => x === '۳')).toHaveLength(1);
  });

  it('ignores blank queries; clear empties the list (also hides the server list)', () => {
    useSearch.getState().remember('   ', []);
    expect(useSearch.getState().recent).toBeNull();
    useSearch.getState().clearRecent();
    expect(recentList(useSearch.getState().recent, ['پیتزا'])).toEqual([]);
    expect(localStorage.getItem(RECENT_KEY)).toBe('[]');
  });
});
