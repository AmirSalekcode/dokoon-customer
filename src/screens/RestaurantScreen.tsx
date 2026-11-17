import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { addToCart } from '@/cart/addToCart';
import { cartCount, cartItemsTotal, qtyOfFood, useCart } from '@/cart/cart';
import { CartSummary } from '@/components/library/CartSummary';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { FoodCard } from '@/components/library/FoodCard';
import { LoadingState } from '@/components/library/LoadingState';
import { RestaurantHeader } from '@/components/library/RestaurantHeader';
import { toFoodCardVM, toRestaurantHeaderVM, visibleGroups } from '@/features/viewmodels';
import { formatNumber, toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from './registry';
import s from './screens.module.css';

/** Foundation demo of the restaurant page: header, menu, single shared cart, food overlay. */
export function RestaurantScreen({ route }: ScreenProps) {
  const id = route.params.restaurantId ?? '';
  const { back, resetTo, openOverlay } = useNav.getState();
  const cart = useCart();
  const data = useApi(async () => {
    const [r, menu] = await Promise.all([
      unwrap(api.GET('/restaurants/{id}', { params: { path: { id } } })),
      unwrap(api.GET('/restaurants/{id}/menu', { params: { path: { id } } })),
    ]);
    return { r, menu };
  }, [id]);

  if (data.status === 'loading') return <LoadingState variant="list" />;
  if (data.status === 'error') return <ErrorState onRetry={data.reload} />;

  const { r, menu } = data.data;
  const orderable = r.open !== false;
  const allowExtras = r.allowExtras !== false;
  const inThisCart = cart.restaurant?.id === r.id && cart.lines.length > 0;

  return (
    <div className={s.pageNoNav}>
      <RestaurantHeader
        r={toRestaurantHeaderVM(r)}
        onBack={() => back()}
        onFav={() => toast('علاقه‌مندی در مرحله‌ی بعد')}
        onShare={() => {}}
      />
      {r.hasMenu === false || menu.length === 0 ? (
        <EmptyState title="منو هنوز آماده نیست" text="این رستوران به‌زودی منوی خود را اضافه می‌کند." />
      ) : (
        menu.map((c) => (
          <section key={c.id} aria-label={c.title}>
            <h2 className={s.sectionTitle}>{c.title}</h2>
            <div className={`${s.pad} ${s.stack}`}>
              {(c.foods ?? []).map((f) => {
                const q = qtyOfFood(cart, f.id!);
                const lines = cart.lines.filter((l) => l.foodId === f.id);
                const hasGroups = visibleGroups(f, allowExtras).length > 0;
                return (
                  <FoodCard
                    key={f.id}
                    f={toFoodCardVM(f, { orderable, allowExtras })}
                    qtyText={inThisCart && q ? toFaDigits(q) : ''}
                    onOpen={() => openOverlay({ kind: 'food', props: { foodId: f.id, restaurantId: r.id } })}
                    onAdd={() =>
                      hasGroups
                        ? openOverlay({ kind: 'food', props: { foodId: f.id, restaurantId: r.id } })
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
