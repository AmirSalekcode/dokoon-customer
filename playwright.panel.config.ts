import { defineConfig, devices } from '@playwright/test';

/**
 * E2E for the restaurant panel (KAN-55+), against a mock-mode build of the panel.
 * Phone frame 390×844; tablet/desktop cases set their own viewport (≥720 layout).
 */
export default defineConfig({
  testDir: './e2e-panel',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5176',
    viewport: { width: 390, height: 844 },
    locale: 'fa-IR',
    hasTouch: true,
    isMobile: true,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'panel-mobile-chromium', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    // Built output (mock data) so the manifest, icons and SPA fallback are the real ones.
    command:
      'npx vite build --config vite.panel.config.ts --mode mock && npx vite preview --config vite.panel.config.ts --host 127.0.0.1 --port 5176 --strictPort',
    url: 'http://127.0.0.1:5176',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
