import { useState } from 'react';
import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { isLoggedIn } from '@/auth/flow';
import { addToCart } from '@/cart/addToCart';
import { FoodDetails } from '@/components/library/FoodDetails';
import { LoadingState } from '@/components/library/LoadingState';
import { Sheet } from '@/components/base/Sheet';
import { ErrorState } from '@/components/library/ErrorState';
import {
  requiredSatisfied,
  toFoodGroupsVM,
  toggleOption,
  unitPriceWith,
  visibleGroups,
  type Selection,
} from '@/features/viewmodels';
import { formatDecimal, formatNumber, toFaDigits } from '@/lib/format';
import { nearBottom, toDistVM, toReviewVM, useFoodReviews } from '@/features/reviews';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';

/** Food sheet overlay: options, quantity, live price, add to the shared cart. */
export function FoodOverlay({ foodId, restaurantId }: { foodId: string; restaurantId: string }) {
  const { closeOverlay, openOverlay, push } = useNav.getState();
  const reviews = useFoodReviews(foodId);
  const [sel, setSel] = useState<Selection>({});
  const [qty, setQty] = useState(1);
  const data = useApi(
    async () => {
      const [food, r] = await Promise.all([
        unwrap(api.GET('/foods/{id}', { params: { path: { id: foodId } } })),
        unwrap(api.GET('/restaurants/{id}', { params: { path: { id: restaurantId } } })),
      ]);
      return { food, r };
    },
    [foodId, restaurantId],
    { fullPageErrors: false },
  );

  if (data.status !== 'success') {
    return (
      <Sheet label="جزئیات غذا" onClose={closeOverlay}>
        {data.status === 'loading' ? (
          <LoadingState variant="list" rows={2} />
        ) : (
          <ErrorState onRetry={data.reload} />
        )}
      </Sheet>
    );
  }

  const { food: f, r } = data.data;
  const groups = visibleGroups(f, r.allowExtras !== false);
  const orderable = r.open !== false && f.available !== false;
  const unit = unitPriceWith(f, groups, sel);
  const canAdd = orderable && requiredSatisfied(groups, sel);

  return (
    <FoodDetails
      food={{
        name: f.title ?? '',
        restaurantName: r.name,
        art: f.imageUrl,
        rating: f.rating ? formatDecimal(f.rating) : undefined,
        reviewCount: f.reviews ? formatNumber(f.reviews) : undefined,
        price: f.price ?? 0,
        oldPrice: f.oldPrice,
        desc: f.desc,
        groups: toFoodGroupsVM(groups, sel, (g, id) => setSel((cur) => toggleOption(g, cur, id))),
        reviews: reviews.initial ? undefined : reviews.items.map(toReviewVM),
        dist: reviews.summary ? toDistVM(reviews.summary.distribution, reviews.summary.count) : undefined,
        hasMore: reviews.hasMore,
      }}
      onScroll={(e) => {
        if (reviews.hasMore && nearBottom(e.currentTarget)) reviews.loadMore();
      }}
      qtyText={toFaDigits(qty)}
      totalText={formatNumber(unit * qty)}
      canAdd={canAdd}
      ctaLabel={
        !orderable
          ? r.open === false
            ? 'رستوران بسته است'
            : 'ناموجود'
          : canAdd
            ? 'افزودن به سبد'
            : 'گزینه‌ی الزامی را انتخاب کنید'
      }
      onClose={closeOverlay}
      onInc={() => setQty((q) => Math.min(q + 1, 20))}
      onDec={() => setQty((q) => Math.max(q - 1, 1))}
      onReview={() => {
        if (!isLoggedIn()) {
          closeOverlay();
          toast('برای ثبت نظر وارد شوید');
          push('login');
          return;
        }
        openOverlay({ kind: 'review', props: { foodId: f.id, foodName: f.title } }, { keepParent: true });
      }}
      onAdd={() => {
        const options = groups.flatMap((g) =>
          (g.options ?? [])
            .filter((o) => sel[g.id!]?.includes(o.id!))
            .map((o) => ({ id: o.id!, title: o.title ?? '', priceDelta: o.priceDelta ?? 0 })),
        );
        closeOverlay();
        addToCart(
          { id: r.id!, name: r.name! },
          { foodId: f.id!, title: f.title!, imageUrl: f.imageUrl, unitPrice: unit, qty, options },
        );
      }}
    />
  );
}
