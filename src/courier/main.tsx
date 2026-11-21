import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/courier.css';
import { useTheme } from '@/theme/theme';
import { config } from '@/config/env';
import { registerPwa } from '@/pwa';
import { CourierApp } from './CourierApp';
import { hydrateCourierSession } from './api/session';

// Apply the theme store (courier.html already set data-theme pre-paint).
useTheme.getState();

async function start() {
  if (config.useMocks) {
    // Mock/demo builds only: the mock API + live offers. Exposed for E2E and dev tools
    // (e.g. __dkCourierMocks.stream.takeByOther('of1')). Holds no data or secrets.
    const mocks = await (await import('./mocks/browser')).startCourierMocks();
    (window as unknown as { __dkCourierMocks?: typeof mocks }).__dkCourierMocks = mocks;
  } else {
    registerPwa();
  }
  // Android app: the Keystore token must be in memory before routing (courier security checklist).
  await hydrateCourierSession().catch((err: unknown) =>
    console.error('[courier] secure session unavailable', err),
  );
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <CourierApp />
    </StrictMode>,
  );
}

void start();
