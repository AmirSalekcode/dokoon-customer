import type { ErrorKind } from '@/api/errors';
import { ErrorPage } from '@/components/library/ErrorPage';
import { config } from '@/config/env';
import type { ErrorAction } from '@/errors/errorContent';
import { runRetry } from '@/errors/retry';
import { isNative } from '@/lib/platform';
import type { StackRoute } from '@/nav/createStackNav';
import { signOutLocal } from '../auth/flow';
import { PANEL_ERROR_CONTENT } from '../errors/panelErrors';
import { usePanelNav, type PanelScreen } from '../nav/nav';

export interface PanelScreenProps {
  route: StackRoute<PanelScreen>;
}

/**
 * Full-page error with the panel's actions (D-106): «بازگشت به خانه» → orders tab,
 * «تماس با پشتیبانی» → help, «مشاهده‌ی سفارش‌ها» → orders. maintenance/update replace the stack.
 */
export function PanelErrorScreen({ route }: PanelScreenProps) {
  const kind = (route.params.kind as ErrorKind) ?? 'e500';
  const c = PANEL_ERROR_CONTENT[kind] ?? PANEL_ERROR_CONTENT.e500;
  const nav = usePanelNav.getState;

  const act = (a?: ErrorAction) => {
    switch (a) {
      case 'retry':
        if (kind === 'offline' && !navigator.onLine) return; // still offline: stay here
        nav().back();
        runRetry();
        return;
      case 'home':
      case 'orders':
        nav().resetTo('orders');
        return;
      case 'login':
        signOutLocal();
        return;
      case 'support':
        nav().push('help');
        return;
      case 'reload':
        location.reload();
        return;
      case 'update':
        if (isNative() && config.updateUrl) window.open(config.updateUrl, '_blank');
        else location.reload();
        return;
    }
  };

  return (
    <ErrorPage
      code={c.code}
      title={c.title}
      text={c.text}
      d={c.d}
      cta={c.cta}
      ctaSecondary={c.sec}
      onPrimary={() => act(c.act)}
      onSecondary={() => act(c.secAct)}
    />
  );
}
