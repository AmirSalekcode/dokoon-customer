import type { ErrorKind } from '@/api/errors';
import { useSession } from '@/auth/session';
import { ErrorPage } from '@/components/library/ErrorPage';
import { ERROR_CONTENT, type ErrorAction } from '@/errors/errorContent';
import { runRetry } from '@/errors/retry';
import { config } from '@/config/env';
import { isNative } from '@/lib/platform';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from './registry';

/**
 * Full-page error (screen-specs §5). Retry = back + repeat the failed request.
 * maintenance/update come from GET /app/config at startup and replace the whole stack.
 */
export function ErrorScreen({ route }: ScreenProps) {
  const kind = (route.params.kind as ErrorKind) ?? 'e500';
  const c = ERROR_CONTENT[kind] ?? ERROR_CONTENT.e500;
  const nav = useNav.getState;

  const act = (a?: ErrorAction) => {
    switch (a) {
      case 'retry':
        if (kind === 'offline' && !navigator.onLine) return; // still offline: stay here
        nav().back();
        runRetry();
        return;
      case 'home':
        nav().resetTo('home');
        return;
      case 'login':
        // Session expired: drop to guest at home, then ask to log in (D-59).
        useSession.getState().clear();
        nav().resetTo('home');
        nav().push('login');
        return;
      case 'support':
        nav().push('support');
        return;
      case 'orders':
        nav().push('orders');
        return;
      case 'reload':
        // Maintenance: start over (splash re-checks GET /app/config).
        location.reload();
        return;
      case 'update':
        // Android: open the store/download page. PWA: a reload fetches the new version.
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
