import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { useLaunch } from '@/auth/flow';
import { Button } from '@/components/base/Button';
import { CategoryItem } from '@/components/library/CategoryItem';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { SearchBar } from '@/components/library/SearchBar';
import { TopBar } from '@/components/library/TopBar';
import { activeCount, useDiscovery } from '@/features/discovery/filters';
import { useRestaurantList } from '@/features/discovery/restaurantList';
import { toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import { RestaurantTile } from './RestaurantTile';
import s from './browse.module.css';

/**
 * Restaurants tab (screen-specs §2 restaurants; guests allowed, D-59). Categories + the FilterSheet
 * shared with Home (same store), paged GET /restaurants. The tab stays mounted under pushed screens,
 * so back keeps its scroll, category, filters and loaded pages.
 */
export function RestaurantsScreen(_: ScreenProps) {
  const { push, openOverlay } = useNav.getState();
  const cityId = useLaunch((st) => st.cityId);
  const { category, applied, setCategory, reset } = useDiscovery();
  const filterCount = activeCount(applied);
  // Categories come from /home (no separate endpoint); failing to load them only hides the chips.
  const home = useApi(
    () => unwrap(api.GET('/home', { params: { query: { cityId: cityId ?? undefined } } })),
    [cityId],
    { fullPageErrors: false },
  );
  const list = useRestaurantList(category, applied);
  const { first } = list;

  const cats = home.status === 'success' ? (home.data.categories ?? []) : [];

  return (
    <div className={s.page}>
      <TopBar title="رستوران‌ها" level={1} />
      <SearchBar
        placeholder="دنبال چه رستوران یا غذایی؟"
        showFilter
        filterCount={filterCount ? toFaDigits(filterCount) : undefined}
        onTap={() => push('search')}
        onFilter={() => {
          useDiscovery.getState().openDraft();
          openOverlay({ kind: 'filter' });
        }}
      />
      {cats.length > 0 ? (
        <nav className={s.cats} aria-label="دسته‌بندی‌ها">
          {cats.map((c) => (
            <CategoryItem
              key={c.id}
              title={c.title ?? ''}
              art={c.imageUrl}
              selected={category === c.id}
              onPick={() => setCategory(c.id!)}
            />
          ))}
        </nav>
      ) : null}

      {first.status === 'loading' ? (
        <LoadingState variant="list" rows={3} />
      ) : first.status === 'error' ? (
        <ErrorState onRetry={first.reload} />
      ) : list.items.length === 0 ? (
        <EmptyState
          title="رستورانی پیدا نشد"
          text="فیلترها یا دسته‌بندی را تغییر دهید."
          action={
            filterCount > 0 || category !== 'all' ? (
              <Button variant="secondary" onClick={reset}>
                حذف فیلترها
              </Button>
            ) : undefined
          }
        />
      ) : (
        <section aria-label="لیست رستوران‌ها">
          <div className={s.grid}>
            {list.items.map((r) => (
              <RestaurantTile key={r.id} r={r} />
            ))}
          </div>
          {list.hasMore ? (
            <div className={s.more}>
              {list.moreFailed ? (
                <p className={s.moreNote} role="alert">
                  بارگذاری ادامه‌ی لیست ناموفق بود.
                </p>
              ) : null}
              <Button variant="secondary" loading={list.loadingMore} onClick={list.loadMore}>
                نمایش رستوران‌های بیشتر
              </Button>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
