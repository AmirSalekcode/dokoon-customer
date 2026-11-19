import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { RestaurantCard } from '@/components/library/RestaurantCard';
import { TopBar } from '@/components/library/TopBar';
import { isFavorite, toggleFavorite, useFavorites } from '@/features/favorites';
import { toRestaurantCardVM } from '@/features/viewmodels';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import s from './account.module.css';

/** Favorite restaurants (screen-specs §6 favs; favorite foods are out of scope). */
export function FavoritesScreen({ route }: ScreenProps) {
  const { back, push, resetTo } = useNav.getState();
  const overrides = useFavorites((st) => st.overrides);
  const onTop = useNav((n) => n.stack.at(-1)?.key === route.key);
  const data = useApi(() => unwrap(api.GET('/favorites/restaurants')), [onTop]);

  const body = () => {
    if (data.status === 'loading') return <LoadingState variant="list" />;
    if (data.status === 'error') return <ErrorState onRetry={data.reload} />;
    const items = data.data.filter((r) => isFavorite(overrides, r.id!, true));
    if (items.length === 0)
      return (
        <EmptyState
          art="dk-mix"
          title="هنوز رستورانی را نشان نکرده‌اید"
          text="با زدن قلب روی هر رستوران، آن را این‌جا پیدا می‌کنید."
          action={<Button onClick={() => resetTo('restaurants')}>رفتن به رستوران‌ها</Button>}
        />
      );
    return (
      <div className={`${s.list} ${s.cards}`}>
        {items.map((r) => (
          <RestaurantCard
            key={r.id}
            r={{ ...toRestaurantCardVM(r), fav: true }}
            onOpen={() => push('restaurant', { restaurantId: r.id! })}
            onFav={() => void toggleFavorite(r.id!, true)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={s.page}>
      <TopBar title="علاقه‌مندی‌ها" onBack={() => back()} />
      {body()}
    </div>
  );
}
