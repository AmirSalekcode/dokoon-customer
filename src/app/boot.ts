import { captureDeepLink } from '@/nav/deepLink';
import { useNav } from '@/nav/nav';
import { hydrateSession } from '@/auth/session';

export interface BootDeps {
  useMocks: boolean;
  startMocks: () => Promise<void>;
  registerPwa: () => void;
  renderApp: () => void;
}

/**
 * App startup. Whatever fails here, the app must still render: a blank screen gives the user
 * nothing to do. Mock worker failure → 503 page (retry reloads); PWA registration failure is
 * ignored (the app works without offline caching).
 */
export async function boot({ useMocks, startMocks, registerPwa, renderApp }: BootDeps): Promise<void> {
  captureDeepLink();
  if (useMocks) {
    try {
      await startMocks();
    } catch (err) {
      console.error('[boot] mock service worker failed', err);
      useNav.getState().showError('e503');
    }
  } else {
    try {
      registerPwa();
    } catch (err) {
      console.error('[boot] PWA registration failed', err);
    }
  }
  try {
    await hydrateSession();
  } catch (err) {
    console.error('[boot] secure session unavailable', err);
  }
  renderApp();
}
