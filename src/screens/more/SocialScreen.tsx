import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { SocialCard } from '@/components/library/SocialCard';
import { TopBar } from '@/components/library/TopBar';
import { ICONS } from '@/components/primitives/Icon';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import s from './more.module.css';

/** Line icons per network host (from the prototype); unknown hosts get the share icon. */
const BRAND_ICONS: Record<string, string> = {
  'instagram.com':
    'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM17.2 6.8h.01',
  't.me': 'M21 4L3 11l5 2 2 6 3-4 5 4zM8 13l9-6',
  'eitaa.com': 'M5 5h14v10H11l-4 4v-4H5zM9 9h6M9 12h4',
  'wa.me': 'M4 20l1.4-4.2A8 8 0 1 1 8.2 18.6zM9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z',
  'aparat.com': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM10 8.5v7l6-3.5z',
};

function iconFor(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return BRAND_ICONS[host] ?? ICONS.share;
  } catch {
    return ICONS.share;
  }
}

/** Social networks (screen-specs §6 social): SocialCard per channel from GET /support/info; opens outside the app. */
export function SocialScreen(_: ScreenProps) {
  const back = useNav((st) => st.back);
  const data = useApi(() => unwrap(api.GET('/support/info')), []);

  const body = () => {
    if (data.status === 'loading') return <LoadingState variant="list" />;
    if (data.status === 'error') return <ErrorState onRetry={data.reload} />;
    const socials = (data.data.socials ?? []).filter((x) => x.title && x.url);
    if (socials.length === 0)
      return (
        <EmptyState
          art="dk-mix"
          title="به‌زودی"
          text="صفحه‌های دکون در شبکه‌های اجتماعی به‌زودی معرفی می‌شوند."
        />
      );
    return socials.map((x) => (
      <SocialCard
        key={x.url}
        title={x.title!}
        handle={x.handle ?? ''}
        d={iconFor(x.url!)}
        onOpen={() => window.open(x.url!, '_blank', 'noopener,noreferrer')}
      />
    ));
  };

  return (
    <div className={s.page}>
      <TopBar title="شبکه‌های اجتماعی" onBack={() => back()} />
      <div className={s.body}>
        <p className={s.desc}>از اخبار، تخفیف‌ها و جشنواره‌های دکون در شبکه‌های اجتماعی ما باخبر شوید.</p>
        {body()}
      </div>
    </div>
  );
}
