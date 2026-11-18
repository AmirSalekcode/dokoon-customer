import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { useTheme } from './theme/theme';
import { App } from './app/App';
import { AppErrorBoundary } from './app/AppErrorBoundary';
import { boot } from './app/boot';
import { registerPwa } from './pwa';
import { config } from './config/env';

// Apply theme store (index.html already set data-theme pre-paint).
useTheme.getState();

void boot({
  useMocks: config.useMocks,
  startMocks: async () => (await import('./mocks/browser')).startMockWorker(),
  registerPwa,
  renderApp: () =>
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </StrictMode>,
    ),
});
