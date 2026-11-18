import type { RestaurantCard as Card } from '@/api/types';
import { useSession } from '@/auth/session';
import { RestaurantCard } from '@/components/library/RestaurantCard';
import { isFavorite, toggleFavorite, useFavorites } from '@/features/favorites';
import { toRestaurantCardVM } from '@/features/viewmodels';
import { useNav } from '@/nav/nav';

/** RestaurantCard wired to navigation and favorites (guests have none: the heart asks to log in). */
export function RestaurantTile({ r }: { r: Card }) {
  const favs = useFavorites((st) => st.overrides);
  const loggedIn = useSession((st) => !!st.accessToken);
  const fav = loggedIn && isFavorite(favs, r.id!, r.isFavorite);
  return (
    <RestaurantCard
      r={{ ...toRestaurantCardVM(r), fav }}
      onOpen={() => useNav.getState().push('restaurant', { restaurantId: r.id! })}
      onFav={() => void toggleFavorite(r.id!, fav)}
    />
  );
}
