import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { CouponCard } from '@/components/library/CouponCard';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { ListRow } from '@/components/library/ListRow';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { applyPromoCode } from '@/features/promos';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import { RestaurantTile } from './RestaurantTile';
import s from './browse.module.css';

const loadOffers = () =>
  Promise.all([
    unwrap(api.GET('/promos')),
    unwrap(api.GET('/restaurants', { params: { query: { hasDiscount: true } } })),
    unwrap(api.GET('/campaigns')),
  ]);

/**
 * Offers tab (screen-specs §2 offers; guests allowed, D-59): public promo codes (CouponCard: copy,
 * apply to a non-empty cart), discounted restaurants and campaigns → `campaign`.
 * Empty sections are hidden; nothing at all shows one empty state.
 */
export function OffersScreen(_: ScreenProps) {
  const data = useApi(loadOffers, []);

  const body = () => {
    if (data.status === 'loading') return <LoadingState variant="list" rows={3} />;
    if (data.status === 'error') return <ErrorState onRetry={data.reload} />;
    const [promos, rests, camps] = data.data;
    const discounted = rests.items ?? [];
    if (promos.length + discounted.length + camps.length === 0)
      return (
        <EmptyState
          art="dk-mix"
          title="فعلاً تخفیفی نیست"
          text="کدها و پیشنهادهای تازه این‌جا نمایش داده می‌شوند."
        />
      );
    return (
      <>
        {promos.length > 0 ? (
          <section aria-labelledby="of-codes">
            <h2 id="of-codes" className={s.sectionHead}>
              کدهای تخفیف
            </h2>
            <div className={s.stack}>
              {promos.map((p) => (
                <CouponCard
                  key={p.code}
                  badge={p.badge ?? ''}
                  title={p.title ?? ''}
                  sub={p.sub}
                  code={p.code ?? ''}
                  onUse={() => void applyPromoCode(p.code ?? '')}
                />
              ))}
            </div>
          </section>
        ) : null}
        {discounted.length > 0 ? (
          <section aria-labelledby="of-rests">
            <h2 id="of-rests" className={s.sectionHead}>
              رستوران‌های تخفیف‌دار
            </h2>
            <div className={s.row}>
              {discounted.map((r) => (
                <RestaurantTile key={r.id} r={r} />
              ))}
            </div>
          </section>
        ) : null}
        {camps.length > 0 ? (
          <section aria-labelledby="of-camps">
            <h2 id="of-camps" className={s.sectionHead}>
              کمپین‌ها
            </h2>
            <div className={s.stack}>
              {camps.map((c) => (
                <ListRow
                  key={c.id}
                  title={c.title ?? ''}
                  sub={c.text}
                  art={c.imageUrl}
                  onTap={() => useNav.getState().push('campaign', { campaignId: c.id! })}
                />
              ))}
            </div>
          </section>
        ) : null}
      </>
    );
  };

  return (
    <div className={s.page}>
      <TopBar title="تخفیف‌ها" level={1} />
      {body()}
    </div>
  );
}
