import { useMemo, useState } from 'react';
import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { isLoggedIn } from '@/auth/flow';
import { addToCart } from '@/cart/addToCart';
import { cartCount, cartItemsTotal, qtyOfFood, useCart } from '@/cart/cart';
import { CartSummary } from '@/components/library/CartSummary';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { FilterChip } from '@/components/library/FilterChip';
import { FoodCard } from '@/components/library/FoodCard';
import { LoadingState } from '@/components/library/LoadingState';
import { RestaurantHeader } from '@/components/library/RestaurantHeader';
import { SearchBar } from '@/components/library/SearchBar';
import { Icon } from '@/components/primitives/Icon';
import { isFavorite, toggleFavorite, useFavorites } from '@/features/favorites';
import { toFoodCardVM, toRestaurantHeaderVM, visibleGroups } from '@/features/viewmodels';
import { formatNumber, normalizeDigits, toFaDigits } from '@/lib/format';
import { restaurantLink } from '@/nav/deepLink';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from './registry';
import s from './restaurant/restaurant.module.css';

/** Match Persian text loosely: ignore ZWNJ/spaces and Arabic ي/ك variants. */
const norm = (t: string) =>
  normalizeDigits(t).replace(/[‌\s]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase();

async function share(name: string, id: string) {
  const url = restaurantLink(id);
  try {
    if (navigator.share) {
      await navigator.share({ title: name, text: `${name} در دکون`, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast('لینک رستوران کپی شد');
  } catch {
    /* user cancelled the share sheet */
  }
}

/** Restaurant page (screen-specs §2): header, info, sticky categories, menu search, foods, cart bar. */
export function RestaurantScreen({ route }: ScreenProps) {
  const id = route.params.restaurantId ?? '';
  const { back, resetTo, push, openOverlay } = useNav.getState();
  const cart = useCart();
  const favs = useFavorites((st) => st.overrides);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<string | null>(null);

  const data = useApi(async () => {
    const [r, menu] = await Promise.all([
      unwrap(api.GET('/restaurants/{id}', { params: { path: { id } } })),
      unwrap(api.GET('/restaurants/{id}/menu', { params: { path: { id } } })),
    ]);
    return { r, menu };
  }, [id]);

  const sections = useMemo(() => {
    if (data.status !== 'success') return [];
    const q = norm(query);
    return data.data.menu
      .map((c) => ({
        ...c,
        foods: (c.foods ?? []).filter((f) => !q || norm(`${f.title} ${f.desc ?? ''}`).includes(q)),
      }))
      .filter((c) => c.foods.length > 0);
  }, [data, query]);

  if (data.status === 'loading') return <LoadingState variant="list" />;
  if (data.status === 'error') return <ErrorState onRetry={data.reload} />;

  const { r, menu } = data.data;
  const orderable = r.open !== false;
  const allowExtras = r.allowExtras !== false;
  const inThisCart = cart.restaurant?.id === r.id && cart.lines.length > 0;
  const fav = isLoggedIn() && isFavorite(favs, r.id!, r.isFavorite);
  const hasMenu = r.hasMenu !== false && menu.length > 0;

  const jump = (catId: string) => {
    setTab(catId);
    document.getElementById(`cat-${catId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={s.page}>
      <RestaurantHeader
        r={{ ...toRestaurantHeaderVM(r), fav }}
        onBack={() => back()}
        onFav={() => void toggleFavorite(r.id!, fav)}
        onShare={() => void share(r.name ?? '', r.id!)}
      />
      <button type="button" className={s.infoBtn} onClick={() => push('restinfo', { restaurantId: r.id! })}>
        <Icon name="info" size={20} />
        اطلاعات رستوران و ساعت کاری
      </button>

      {!hasMenu ? (
        <EmptyState
          art="dk-cafe"
          title="منو به‌زودی اضافه می‌شود"
          text="این رستوران هنوز منوی خود را کامل نکرده است."
        />
      ) : (
        <>
          <div className={s.search}>
            <SearchBar placeholder="جستجو در منوی رستوران" editable value={query} onInput={setQuery} />
          </div>
          <nav className={s.tabs} aria-label="دسته‌بندی منو">
            {menu.map((c) => (
              <FilterChip
                key={c.id}
                label={c.title ?? ''}
                selected={tab === c.id}
                onPick={() => jump(c.id!)}
              />
            ))}
          </nav>
          {sections.length === 0 ? (
            <EmptyState title="غذایی پیدا نشد" text="عبارت دیگری را جستجو کنید." />
          ) : (
            sections.map((c) => (
              <section key={c.id} aria-labelledby={`cat-${c.id}`}>
                <h2 id={`cat-${c.id}`} className={s.sectionHead}>
                  {c.title}
                </h2>
                <div className={s.foods}>
                  {c.foods.map((f) => {
                    const q = qtyOfFood(cart, f.id!);
                    const lines = cart.lines.filter((l) => l.foodId === f.id);
                    const hasGroups = visibleGroups(f, allowExtras).length > 0;
                    const openSheet = () =>
                      openOverlay({ kind: 'food', props: { foodId: f.id, restaurantId: r.id } });
                    return (
                      <FoodCard
                        key={f.id}
                        f={toFoodCardVM(f, { orderable, allowExtras })}
                        qtyText={inThisCart && q ? toFaDigits(q) : ''}
                        onOpen={openSheet}
                        onAdd={() =>
                          hasGroups
                            ? openSheet()
                            : addToCart(
                                { id: r.id!, name: r.name! },
                                {
                                  foodId: f.id!,
                                  title: f.title!,
                                  imageUrl: f.imageUrl,
                                  unitPrice: f.price!,
                                  options: [],
                                },
                              )
                        }
                        onInc={() => lines[0] && cart.inc(lines[0].lineId)}
                        onDec={() => lines[0] && cart.dec(lines[0].lineId)}
                      />
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </>
      )}

      {inThisCart ? (
        <div className={s.dock}>
          <CartSummary
            count={toFaDigits(cartCount(cart))}
            total={formatNumber(cartItemsTotal(cart))}
            onOpen={() => resetTo('cart')}
          />
        </div>
      ) : null}
    </div>
  );
}
