import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { useSession } from '@/auth/session';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { ListRow } from '@/components/library/ListRow';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import type { RouteParams, ScreenId } from '@/nav/types';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import s from './account.module.css';

const BELL = 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0';
const dateFmt = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' });

/** Notification `target` ({screen, id}) → app route. Unknown targets just mark read. */
function routeFor(target?: { screen?: string; id?: string } | null): [ScreenId, RouteParams] | null {
  if (!target?.screen || !target.id) return null;
  if (target.screen === 'track') return ['track', { orderId: target.id }];
  if (target.screen === 'restaurant') return ['restaurant', { restaurantId: target.id }];
  if (target.screen === 'campaign') return ['campaign', { campaignId: target.id }];
  return null;
}

function setUnread(n: number) {
  const s = useSession.getState();
  if (s.user) s.setUser({ ...s.user, unreadNotifications: Math.max(0, n) });
}

/** Notifications (screen-specs §6): read/unread, tap → related screen, «خواندن همه». */
export function NotificationsScreen({ route }: ScreenProps) {
  const { back, push } = useNav.getState();
  const onTop = useNav((n) => n.stack.at(-1)?.key === route.key);
  const data = useApi(() => unwrap(api.GET('/notifications')), [onTop]);

  const markRead = async (body: { ids?: string[]; all?: boolean }) => {
    try {
      await api.POST('/notifications/read', { body });
    } catch {
      /* best effort; the next load shows the server state */
    }
  };

  const body = () => {
    if (data.status === 'loading') return <LoadingState variant="list" />;
    if (data.status === 'error') return <ErrorState onRetry={data.reload} />;
    const items = data.data.items ?? [];
    if (items.length === 0)
      return <EmptyState art="dk-mix" title="اعلانی ندارید" text="خبرهای سفارش و پیشنهادها این‌جا می‌آید." />;
    const unread = items.filter((n) => !n.read).length;
    return (
      <>
        {unread ? (
          <div className={s.body}>
            <button
              type="button"
              className={s.edit}
              onClick={async () => {
                await markRead({ all: true });
                setUnread(0);
                data.reload();
              }}
            >
              خواندن همه
            </button>
          </div>
        ) : null}
        <ul className={`${s.list} ${s.plain}`} aria-label="اعلان‌ها">
          {items.map((n) => (
            <li key={n.id}>
              <ListRow
                title={n.title ?? ''}
                sub={n.body}
                meta={n.createdAt ? dateFmt.format(new Date(n.createdAt)) : undefined}
                d={BELL}
                dot={!n.read}
                onTap={async () => {
                  if (!n.read && n.id) {
                    await markRead({ ids: [n.id] });
                    setUnread(unread - 1);
                  }
                  const r = routeFor(n.target as { screen?: string; id?: string } | null);
                  if (r) push(r[0], r[1]);
                  else data.reload();
                }}
              />
            </li>
          ))}
        </ul>
      </>
    );
  };

  return (
    <div className={s.page}>
      <TopBar title="اعلان‌ها" onBack={() => back()} />
      {body()}
    </div>
  );
}
