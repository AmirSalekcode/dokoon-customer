import type { ErrorKind } from '@/api/errors';
import { ErrorPage } from '@/components/library/ErrorPage';
import { config } from '@/config/env';
import type { ErrorAction } from '@/errors/errorContent';
import { runRetry } from '@/errors/retry';
import { isNative } from '@/lib/platform';
import { signOutToLogin } from '../auth/flow';
import { COURIER_ERROR_CONTENT } from '../errors/courierErrors';
import { useCourierNav } from '../nav/nav';
import type { CourierScreenProps } from './types';

/**
 * Full-page error (offline, 401, 403, 404, 5xx, maintenance, update). «تلاش دوباره» returns to the exact
 * previous screen and re-runs its request; «بازگشت به خانه» / «مشاهده‌ی سفارش‌ها» → orders tab;
 * 401 → the session ends and the login page opens; «پشتیبانی» → the account tab for now (support: KAN-101).
 */
export function ErrorScreen({ route }: CourierScreenProps) {
  const kind = (route.params.kind as ErrorKind) ?? 'e500';
  const c = COURIER_ERROR_CONTENT[kind] ?? COURIER_ERROR_CONTENT.e500;
  const nav = useCourierNav.getState;

  const act = (a?: ErrorAction) => {
    switch (a) {
      case 'retry':
        if (kind === 'offline' && !navigator.onLine) return; // still offline: stay here
        if (!nav().back()) nav().resetTo('orders');
        runRetry();
        return;
      case 'home':
      case 'orders':
        nav().resetTo('orders');
        return;
      case 'login':
        signOutToLogin();
        return;
      case 'support':
        nav().resetTo('account');
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
