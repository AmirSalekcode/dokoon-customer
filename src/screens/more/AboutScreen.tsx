import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { MenuList, type MenuItemVM } from '@/components/library/MenuList';
import { TopBar } from '@/components/library/TopBar';
import { Art } from '@/components/primitives/Art';
import { ICONS } from '@/components/primitives/Icon';
import { toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import s from './more.module.css';

/** «۰٫۱٫۰» — Persian digits with the Persian decimal separator. */
export const appVersionFa = () => toFaDigits(__APP_VERSION__).replace(/\./g, '٫');

/** About (screen-specs §6 about): draft text from GET /content/about, app version, links to legal pages. */
export function AboutScreen(_: ScreenProps) {
  const { back, push } = useNav.getState();
  const data = useApi(() => unwrap(api.GET('/content/{key}', { params: { path: { key: 'about' } } })), []);

  const items: MenuItemVM[] = [
    { id: 'terms', label: 'قوانین و مقررات', d: ICONS.info, onPick: () => push('legal', { kind: 'terms' }) },
    { id: 'privacy', label: 'حریم خصوصی', d: ICONS.user, onPick: () => push('legal', { kind: 'privacy' }) },
    { id: 'social', label: 'شبکه‌های اجتماعی', d: ICONS.share, onPick: () => push('social') },
    { id: 'rateapp', label: 'امتیاز به دکون', d: ICONS.heart, onPick: () => push('rateapp') },
  ];

  const intro = () => {
    if (data.status === 'loading') return <LoadingState variant="list" />;
    if (data.status === 'error') return <ErrorState onRetry={data.reload} />;
    return (
      <div className={s.card}>
        <Art src="dk-all" className={s.cardArt} />
        <h2>{data.data.title || 'درباره‌ی دکون'}</h2>
        <p className={s.desc}>{data.data.body}</p>
        <small className={s.version}>نسخه‌ی {appVersionFa()}</small>
      </div>
    );
  };

  return (
    <div className={s.page}>
      <TopBar title="درباره ما" onBack={() => back()} />
      <div className={s.body}>
        {intro()}
        <MenuList groups={[{ id: 'links', items }]} />
      </div>
    </div>
  );
}
