import { useState } from 'react';
import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { useSession } from '@/auth/session';
import { displayName } from '@/auth/flow';
import { CategoryItem } from '@/components/library/CategoryItem';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { Header } from '@/components/library/Header';
import { LoadingState } from '@/components/library/LoadingState';
import { RestaurantCard } from '@/components/library/RestaurantCard';
import { SearchBar } from '@/components/library/SearchBar';
import { toRestaurantCardVM } from '@/features/viewmodels';
import { greeting } from '@/lib/format';
import { useNav } from '@/nav/nav';
import s from './screens.module.css';

/** Foundation demo of Home: real API client + mock data + loading/empty/error states. */
export function HomeScreen() {
  const { push, openOverlay } = useNav.getState();
  const name = displayName(useSession((st) => st.user?.name));
  const [cat, setCat] = useState('all');
  const home = useApi(() => unwrap(api.GET('/home', { params: { query: { cityId: 'shahreza' } } })), []);

  return (
    <div className={s.page}>
      <Header
        address="شهرضا، خیابان امام"
        onMenu={() => openOverlay({ kind: 'menu' })}
        onAddress={() => openOverlay({ kind: 'address' })}
      />
      <h1 className={s.greet}>{greeting(name)}</h1>
      <SearchBar placeholder="جستجوی رستوران یا غذا" onTap={() => push('search')} />

      {home.status === 'loading' ? <LoadingState /> : null}
      {home.status === 'error' ? <ErrorState onRetry={home.reload} /> : null}
      {home.status === 'success' ? (
        <>
          <div className={s.cats}>
            {(home.data.categories ?? []).map((c) => (
              <CategoryItem
                key={c.id}
                title={c.title ?? ''}
                art={c.imageUrl}
                selected={cat === c.id}
                onPick={() => setCat(c.id!)}
              />
            ))}
          </div>
          {(home.data.sections ?? []).length === 0 ? (
            <EmptyState title="رستورانی پیدا نشد" text="در محدوده‌ی آدرس شما هنوز رستورانی فعال نیست." />
          ) : (
            (home.data.sections ?? []).map((sec) => (
              <section key={sec.id} aria-label={sec.title}>
                <h2 className={s.sectionTitle}>{sec.title}</h2>
                <div className={s.row}>
                  {(sec.restaurants ?? []).map((r) => (
                    <RestaurantCard
                      key={r.id}
                      r={toRestaurantCardVM(r)}
                      onOpen={() => push('restaurant', { restaurantId: r.id! })}
                      onFav={() => {}}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      ) : null}
      <div className={s.scrollFiller} data-testid="scroll-filler" />
    </div>
  );
}
