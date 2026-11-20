import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/panel.css';
import { useTheme } from '@/theme/theme';
import { config } from '@/config/env';
import { registerPwa } from '@/pwa';
import { PanelApp } from './PanelApp';
import { setSocketFactory } from './realtime/live';

// Apply the theme store (panel.html already set data-theme pre-paint).
useTheme.getState();

async function start() {
  if (config.useMocks) {
    // Mock/demo builds only: the mock API + live stream. Exposed for E2E and dev tools
    // (e.g. __dkPanelMocks.stream.dropAll() to see the offline page). Holds no data or secrets.
    const mocks = await (await import('./mocks/browser')).startPanelMocks();
    (window as unknown as { __dkPanelMocks?: typeof mocks }).__dkPanelMocks = mocks;
    setSocketFactory(mocks.stream.connect);
  } else {
    registerPwa();
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <PanelApp />
    </StrictMode>,
  );
}

void start();
