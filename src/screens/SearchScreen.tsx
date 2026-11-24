import { useEffect, useState } from 'react';
import type { FoodHit, RestaurantCard } from '@/api/types';
import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { FilterChip } from '@/components/library/FilterChip';
import { ListRow } from '@/components/library/ListRow';
import { LoadingState } from '@/components/library/LoadingState';
import { SearchBar } from '@/components/library/SearchBar';
import { TopBar } from '@/components/library/TopBar';
import { activeCount, useDiscovery } from '@/features/discovery/filters';
import {
  SEARCH_DEBOUNCE_MS,
  filterFoods,
  filterRestaurants,
  normalizeQuery,
  recentList,
  unsupportedFilters,
  useSearch,
} from '@/features/discovery/search';
import { foodDiscountVM } from '@/features/viewmodels';
import { formatDecimal, formatMoney, formatNumber, toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from './registry';
import s from './search.module.css';

const PLACEHOLDER = 'رستوران یا غذا را جستجو کنید';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Search (screen-specs §2 search, D-59: no login needed). Recent + popular queries while idle,
 * debounced GET /search, results in two groups (restaurants, foods). The query lives in a store,
 * so back from a result — or opening search again — shows the same text and results.
 */
export function SearchScreen(_: ScreenProps) {
  const { back, push, openOverlay } = useNav.getState();
  const { query, recent: localRecent, setQuery, remember, clearRecent } = useSearch();
  const { applied, reset: resetFilters } = useDiscovery();
  const filterCount = activeCount(applied);

  const typed = normalizeQuery(query);
  const q = useDebounced(typed, SEARCH_DEBOUNCE_MS);
  const settling = typed !== q;

  const sugg = useApi(() => unwrap(api.GET('/search/suggestions')), [], { fullPageErrors: false });
  const res = useApi(
    () => (q ? unwrap(api.GET('/search', { params: { query: { q } } })) : Promise.resolve(null)),
    [q],
  );

  const serverRecent = sugg.status === 'success' ? sugg.data.recent : undefined;
  const recent = recentList(localRecent, serverRecent);
  const popular = sugg.status === 'success' ? (sugg.data.popular ?? []) : [];

  const rests =
    res.status === 'success' && res.data ? filterRestaurants(res.data.restaurants ?? [], applied) : [];
  const foods = res.status === 'success' && res.data ? filterFoods(res.data.foods ?? [], applied) : [];
  const rawCount =
    res.status === 'success' && res.data
      ? (res.data.restaurants ?? []).length + (res.data.foods ?? []).length
      : 0;

  const openRestaurant = (r: RestaurantCard) => {
    remember(typed, serverRecent);
    push('restaurant', { restaurantId: r.id! });
  };
  const openFood = (h: FoodHit) => {
    const rid = h.restaurant?.id ?? h.food!.restaurantId!;
    remember(typed, serverRecent);
    push('restaurant', { restaurantId: rid });
    openOverlay({ kind: 'food', props: { foodId: h.food!.id, restaurantId: rid } });
  };

  const chips = (label: string, items: string[]) =>
    items.map((t) => <FilterChip key={`${label}-${t}`} label={t} onPick={() => setQuery(t)} />);

  return (
    <div className={s.page}>
      <TopBar title="جستجو" level={1} onBack={() => back()} />
      <SearchBar
        placeholder={PLACEHOLDER}
        editable
        autoFocus={!query}
        value={query}
        onInput={setQuery}
        showFilter
        filterCount={filterCount ? toFaDigits(filterCount) : undefined}
        onFilter={() => {
          useDiscovery.getState().openDraft();
          openOverlay({ kind: 'filter' });
        }}
      />

      {!typed ? (
        <>
          {recent.length > 0 ? (
            <section aria-labelledby="sr-recent">
              <div className={s.head}>
                <h2 id="sr-recent" className={s.title}>
                  جستجوهای اخیر
                </h2>
                <button
                  type="button"
                  className={s.more}
                  aria-label="پاک کردن جستجوهای اخیر"
                  onClick={clearRecent}
                >
                  پاک کردن
                </button>
              </div>
              <div className={s.chips}>{chips('r', recent)}</div>
            </section>
          ) : null}
          {sugg.status === 'loading' ? <LoadingState variant="list" rows={1} /> : null}
          {popular.length > 0 ? (
            <section aria-labelledby="sr-popular">
              <h2 id="sr-popular" className={`${s.title} ${s.head}`}>
                جستجوهای محبوب
              </h2>
              <div className={s.chips}>{chips('p', popular)}</div>
            </section>
          ) : null}
        </>
      ) : settling || res.status === 'loading' ? (
        <LoadingState variant="list" rows={3} />
      ) : res.status === 'error' ? (
        <ErrorState onRetry={res.reload} />
      ) : rests.length + foods.length === 0 ? (
        rawCount > 0 ? (
          <EmptyState
            art="dk-all"
            title="نتیجه‌ای با این فیلترها نیست"
            text={`برای «${typed}» نتیجه هست، ولی با فیلترهای فعلی نمایش داده نمی‌شود.`}
            action={
              <Button variant="secondary" onClick={resetFilters}>
                حذف فیلترها
              </Button>
            }
          />
        ) : (
          <>
            <EmptyState art="dk-all" title="نتیجه‌ای پیدا نشد" text="عبارت دیگری را جستجو کنید." />
            {popular.length > 0 ? (
              <section aria-labelledby="sr-try">
                <h2 id="sr-try" className={`${s.title} ${s.head}`}>
                  این‌ها را امتحان کنید
                </h2>
                <div className={s.chips}>{chips('t', popular)}</div>
              </section>
            ) : null}
          </>
        )
      ) : (
        <>
          {unsupportedFilters(applied) ? (
            <p role="note" className={s.note}>
              فیلتر نوع غذا در جستجو اعمال نمی‌شود؛ بقیه‌ی فیلترها اعمال شده‌اند.
            </p>
          ) : null}
          {rests.length > 0 ? (
            <section aria-labelledby="sr-rests">
              <h2 id="sr-rests" className={`${s.title} ${s.head}`}>
                رستوران‌ها
              </h2>
              <div className={s.list}>
                {rests.map((r) => (
                  <ListRow
                    key={r.id}
                    title={r.name ?? ''}
                    sub={[
                      r.sub,
                      r.distanceKm != null ? `${formatDecimal(r.distanceKm)} کیلومتر` : null,
                      r.open === false ? 'بسته' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    meta={r.rating ? `★ ${formatDecimal(r.rating)}` : undefined}
                    art={r.coverUrl}
                    onTap={() => openRestaurant(r)}
                  />
                ))}
              </div>
            </section>
          ) : null}
          {foods.length > 0 ? (
            <section aria-labelledby="sr-foods">
              <h2 id="sr-foods" className={`${s.title} ${s.head}`}>
                غذاها
              </h2>
              <div className={s.list}>
                {foods.map((h) => (
                  <ListRow
                    key={`${h.restaurant?.id}-${h.food!.id}`}
                    title={h.food!.title ?? ''}
                    sub={h.restaurant?.name}
                    meta={h.food!.price != null ? formatMoney(h.food!.price) : undefined}
                    metaOld={foodDiscountVM(h.food!) ? formatNumber(h.food!.oldPrice ?? 0) : undefined}
                    badge={foodDiscountVM(h.food!)?.badge}
                    art={h.food!.imageUrl}
                    onTap={() => openFood(h)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
