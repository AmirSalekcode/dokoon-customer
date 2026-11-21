import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/courier.css';
import { useTheme } from '@/theme/theme';
import { config } from '@/config/env';
import { registerPwa } from '@/pwa';
import { CourierApp } from './CourierApp';

// Apply the theme store (courier.html already set data-theme pre-paint).
useTheme.getState();

// In mock mode the MSW worker will own the service-worker scope (KAN-86).
if (!config.useMocks) registerPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CourierApp />
  </StrictMode>,
);
