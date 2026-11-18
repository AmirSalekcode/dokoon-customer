import { useCallback, useState } from 'react';
import { api } from '@/api/client';
import type { RestaurantCard } from '@/api/types';
import { unwrap, useApi } from '@/api/useApi';
import { type Filters, toQuery } from './filters';

type Query = ReturnType<typeof toQuery>;

interface More {
  /** The first page these extra pages belong to (a reload/filter change starts over). */
  base: unknown;
  items: RestaurantCard[];
  cursor: string | null;
  loading: boolean;
  failed: boolean;
}

/**
 * GET /restaurants with cursor paging. The first page goes through useApi (loading / error /
 * full-page errors); later pages append in place and fail inline, keeping what is already shown.
 */
export function useRestaurantList(category: string, filters: Filters) {
  const query: Query = toQuery(category, filters);
  const key = JSON.stringify(query);
  const first = useApi(() => unwrap(api.GET('/restaurants', { params: { query } })), [key]);
  const [more, setMore] = useState<More | null>(null);

  const base = first.status === 'success' ? first.data : null;
  const extra = more && base && more.base === base ? more : null;
  const items = base ? [...(base.items ?? []), ...(extra?.items ?? [])] : [];
  const cursor = extra ? extra.cursor : (base?.nextCursor ?? null);

  const loadMore = useCallback(async () => {
    if (!base || !cursor || extra?.loading) return;
    const prev = extra ?? { base, items: [], cursor, loading: false, failed: false };
    setMore({ ...prev, loading: true, failed: false });
    try {
      const page = await unwrap(api.GET('/restaurants', { params: { query: { ...query, cursor } } }));
      setMore({
        base,
        items: [...prev.items, ...(page.items ?? [])],
        cursor: page.nextCursor ?? null,
        loading: false,
        failed: false,
      });
    } catch {
      setMore({ ...prev, loading: false, failed: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `query` is captured through `key`
  }, [base, cursor, extra, key]);

  return {
    first,
    items,
    hasMore: cursor != null,
    loadingMore: !!extra?.loading,
    moreFailed: !!extra?.failed,
    loadMore: () => void loadMore(),
  };
}
