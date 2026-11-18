import { api } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { RestaurantCard } from '@/api/types';
import { unwrap, useApi } from '@/api/useApi';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { Art } from '@/components/primitives/Art';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import { RestaurantTile } from './RestaurantTile';
import s from './browse.module.css';

/**
 * Campaign + participants. The contract has no batch endpoint for cards by id (contract-notes #14),
 * so each GET /restaurants/{id} runs in parallel; one that fails (removed, hidden) is skipped.
 */
async function loadCampaign(id: string) {
  if (!id) throw new ApiError({ status: 404, kind: 'e404' });
  const campaign = await unwrap(api.GET('/campaigns/{id}', { params: { path: { id } } }));
  const settled = await Promise.allSettled(
    (campaign.restaurantIds ?? []).map((rid) =>
      unwrap(api.GET('/restaurants/{id}', { params: { path: { id: rid } } })),
    ),
  );
  const restaurants: RestaurantCard[] = settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  return { campaign, restaurants };
}

/** Campaign (screen-specs §2 campaign): banner + text + participating restaurants → `restaurant`. */
export function CampaignScreen({ route }: ScreenProps) {
  const back = useNav((st) => st.back);
  const id = route.params.campaignId ?? '';
  const data = useApi(() => loadCampaign(id), [id]);

  const body = () => {
    if (data.status === 'loading') return <LoadingState variant="list" rows={3} />;
    if (data.status === 'error') return <ErrorState onRetry={data.reload} />;
    const { campaign, restaurants } = data.data;
    return (
      <>
        <div className={s.hero}>
          <h1>{campaign.title}</h1>
          <Art src={campaign.imageUrl} className={s.heroArt} />
        </div>
        {campaign.text ? <p className={s.text}>{campaign.text}</p> : null}
        <section aria-labelledby="cp-rests">
          <h2 id="cp-rests" className={s.sectionHead}>
            رستوران‌های این کمپین
          </h2>
          {restaurants.length === 0 ? (
            <EmptyState title="رستوران‌های این کمپین فعلاً در دسترس نیستند" text="کمی بعد دوباره سر بزنید." />
          ) : (
            <div className={s.grid}>
              {restaurants.map((r) => (
                <RestaurantTile key={r.id} r={r} />
              ))}
            </div>
          )}
        </section>
      </>
    );
  };

  return (
    <div className={s.pageNoNav}>
      <TopBar title="کمپین" onBack={() => back()} />
      {body()}
    </div>
  );
}
