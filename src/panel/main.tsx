import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/panel.css';
import { useTheme } from '@/theme/theme';
import { config } from '@/config/env';
import { registerPwa } from '@/pwa';
import { PanelApp } from './PanelApp';

// Apply the theme store (panel.html already set data-theme pre-paint).
useTheme.getState();

// In mock mode the MSW worker will own the service-worker scope (KAN-56).
if (!config.useMocks) registerPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PanelApp />
  </StrictMode>,
);
