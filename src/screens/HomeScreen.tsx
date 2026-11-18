import type { Campaign, RestaurantCard as Card } from '@/api/types';
import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { displayName, useLaunch } from '@/auth/flow';
import { useSession } from '@/auth/session';
import { Button } from '@/components/base/Button';
import { CategoryItem } from '@/components/library/CategoryItem';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { Header } from '@/components/library/Header';
import { LoadingState } from '@/components/library/LoadingState';
import { RestaurantCard } from '@/components/library/RestaurantCard';
import { SearchBar } from '@/components/library/SearchBar';
import { activeCount, toQuery, useDiscovery } from '@/features/discovery/filters';
import { isFavorite, toggleFavorite, useFavorites } from '@/features/favorites';
import { toRestaurantCardVM } from '@/features/viewmodels';
import { greeting, toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import { Banners } from './home/Banners';
import s from './home/home.module.css';
import type { ScreenProps } from './registry';

/** Home tab (screen-specs §2): header, greeting, search, campaigns, categories, restaurant lists. */
export function HomeScreen(_: ScreenProps) {
  const { push, openOverlay } = useNav.getState();
  const name = displayName(useSession((st) => st.user?.name));
  const cityId = useLaunch((st) => st.cityId);
  const { category, applied, setCategory, reset } = useDiscovery();
  const browsing = category === 'all' && activeCount(applied) === 0;
  const filterCount = activeCount(applied);
  const favs = useFavorites((st) => st.overrides);
  const loggedIn = useSession((st) => !!st.accessToken);

  const home = useApi(
    () => unwrap(api.GET('/home', { params: { query: { cityId: cityId ?? undefined } } })),
    [cityId],
  );
  const cities = useApi(() => unwrap(api.GET('/cities')), [], { fullPageErrors: false });
  const queryKey = JSON.stringify(toQuery(category, applied));
  const results = useApi(
    () =>
      browsing
        ? Promise.resolve(null)
        : unwrap(api.GET('/restaurants', { params: { query: toQuery(category, applied) } })),
    [browsing, queryKey],
  );

  const cityName = cities.status === 'success' ? cities.data.find((c) => c.id === cityId)?.name : undefined;

  const card = (r: Card) => {
    // Guests have no favorites (login needed to save them).
    const fav = loggedIn && isFavorite(favs, r.id!, r.isFavorite);
    return (
      <RestaurantCard
        key={r.id}
        r={{ ...toRestaurantCardVM(r), fav }}
        onOpen={() => push('restaurant', { restaurantId: r.id! })}
        onFav={() => void toggleFavorite(r.id!, fav)}
      />
    );
  };

  const openCampaign = (c: Campaign) => {
    const ids = c.restaurantIds ?? [];
    if (ids.length === 1) push('restaurant', { restaurantId: ids[0] });
    else push('campaign', { campaignId: c.id! });
  };

  return (
    <div className={s.page}>
      <Header
        address={cityName ?? 'انتخاب آدرس'}
        onMenu={() => openOverlay({ kind: 'menu' })}
        onAddress={() => openOverlay({ kind: 'address' })}
      />
      <h1 className={s.greet}>{greeting(name)}</h1>
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

      {home.status === 'loading' ? <LoadingState /> : null}
      {home.status === 'error' ? <ErrorState onRetry={home.reload} /> : null}
      {home.status === 'success' ? (
        <>
          <Banners items={home.data.banners ?? []} onOpen={openCampaign} />
          <nav className={s.cats} aria-label="دسته‌بندی‌ها">
            {(home.data.categories ?? []).map((c) => (
              <CategoryItem
                key={c.id}
                title={c.title ?? ''}
                art={c.imageUrl}
                selected={category === c.id}
                onPick={() => setCategory(c.id!)}
              />
            ))}
          </nav>

          {browsing ? (
            (home.data.sections ?? []).length === 0 ? (
              <EmptyState title="رستورانی پیدا نشد" text="در محدوده‌ی شما هنوز رستورانی فعال نیست." />
            ) : (
              (home.data.sections ?? []).map((sec) => (
                <section key={sec.id} aria-labelledby={`sec-${sec.id}`}>
                  <h2 id={`sec-${sec.id}`} className={s.sectionHead}>
                    {sec.title}
                  </h2>
                  <div className={s.row}>{(sec.restaurants ?? []).map(card)}</div>
                </section>
              ))
            )
          ) : results.status === 'loading' ? (
            <LoadingState variant="list" rows={2} />
          ) : results.status === 'error' ? (
            <ErrorState onRetry={results.reload} />
          ) : (results.data?.items ?? []).length === 0 ? (
            <EmptyState
              title="رستورانی پیدا نشد"
              text="فیلترها یا دسته‌بندی را تغییر دهید."
              action={
                <Button variant="secondary" onClick={reset}>
                  حذف فیلترها
                </Button>
              }
            />
          ) : (
            <section aria-label="نتایج">
              <h2 className={s.sectionHead}>{toFaDigits(results.data!.items!.length)} رستوران</h2>
              <div className={s.grid}>{results.data!.items!.map(card)}</div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
