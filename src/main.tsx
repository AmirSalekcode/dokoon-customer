import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { useTheme } from './theme/theme';
import { App } from './app/App';
import { registerPwa } from './pwa';

async function boot() {
  // Apply theme store (index.html already set data-theme pre-paint).
  useTheme.getState();
  if (import.meta.env.VITE_USE_MOCKS === '1') {
    const { startMockWorker } = await import('./mocks/browser');
    await startMockWorker();
  } else {
    registerPwa();
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
