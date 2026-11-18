import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import type { Review, ReviewPage } from '@/api/types';
import type { FoodReviewVM } from '@/components/library/FoodDetails';
import { formatNumber, toFaDigits } from '@/lib/format';

interface ReviewsState {
  summary: Omit<ReviewPage, 'items' | 'nextCursor'> | null;
  items: Review[];
  cursor: string | null;
  /** First page not loaded yet. */
  initial: boolean;
}

async function fetchPage(foodId: string, cursor: string | null): Promise<ReviewPage | null> {
  try {
    const { data } = await api.GET('/foods/{id}/reviews', {
      params: { path: { id: foodId }, query: cursor ? { cursor } : {} },
    });
    return data ?? null;
  } catch {
    return null; // offline: keep what we have; the next scroll retries
  }
}

/** Food reviews with cursor paging (GET /foods/{id}/reviews?cursor=…). */
export function useFoodReviews(foodId: string) {
  const [st, setSt] = useState<ReviewsState>({ summary: null, items: [], cursor: null, initial: true });
  const busy = useRef(false);

  const apply = useCallback((data: ReviewPage | null, append: boolean) => {
    if (!data) return;
    const { items = [], nextCursor = null, ...summary } = data;
    setSt((cur) => ({
      summary,
      items: append ? [...cur.items, ...items] : items,
      cursor: nextCursor,
      initial: false,
    }));
  }, []);

  useEffect(() => {
    let alive = true;
    void fetchPage(foodId, null).then((d) => alive && apply(d, false));
    return () => {
      alive = false;
    };
  }, [foodId, apply]);

  const loadMore = useCallback(async () => {
    if (!st.cursor || busy.current) return;
    busy.current = true;
    apply(await fetchPage(foodId, st.cursor), true);
    busy.current = false;
  }, [foodId, st.cursor, apply]);

  return { ...st, hasMore: st.cursor != null, loadMore: () => void loadMore() };
}

const dateFmt = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' });

export function toReviewVM(r: Review): FoodReviewVM {
  const name = r.userName || 'کاربر دکون';
  return {
    id: r.id ?? '',
    initial: name.slice(0, 1),
    name,
    date: r.createdAt ? dateFmt.format(new Date(r.createdAt)) : '',
    stars: r.stars ?? 0,
    text: r.text ?? '',
  };
}

/** distribution is counts for 5..1 stars → bar rows with percent. */
export function toDistVM(distribution: number[] = [], count = 0) {
  const total = count || distribution.reduce((a, b) => a + b, 0) || 1;
  return [5, 4, 3, 2, 1].map((n, i) => {
    const pct = Math.round(((distribution[i] ?? 0) / total) * 100);
    return { n: toFaDigits(n), pct, pctText: formatNumber(pct) };
  });
}

/** Near the bottom of a scroll container → time to load the next page. */
export const nearBottom = (el: HTMLElement, px = 240) =>
  el.scrollHeight - el.scrollTop - el.clientHeight < px;
