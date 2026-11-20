import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

/**
 * Restaurant panel (panel.dokoonapp.ir) — the second entry of this repo (decision D-91).
 * Shares src/components, src/lib, src/theme, src/errors, src/nav, design-tokens and assets/fonts with
 * the customer app; its own code lives in src/panel and builds to dist-panel/.
 * Unit tests run once for both apps from vite.config.ts.
 */
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

const SHELL = '/panel.html';

/** Dev/preview: every page navigation gets panel.html (Vite's own SPA fallback would serve index.html). */
function panelShell(): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    const url = req.url ?? '/';
    const pathname = url.split('?')[0];
    const wantsHtml = (req.headers.accept ?? '').includes('text/html');
    const isPage = req.method === 'GET' && (pathname === '/' || wantsHtml);
    if (isPage && !/\.\w+$/.test(pathname) && !pathname.startsWith('/@')) req.url = SHELL;
    next();
  };
  return {
    name: 'dokoon-panel-shell',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  };
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  publicDir: 'public-panel',
  plugins: [
    panelShell(),
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        id: '/',
        name: 'دکون رستوران',
        short_name: 'دکون رستوران',
        description: 'پنل مدیریت سفارش‌های رستوران در دکون',
        lang: 'fa',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Phones portrait; tablets/desktop rotate freely (the panel is responsive ≥720).
        orientation: 'any',
        // Manifest colors must be literal; they mirror --bg (light) and --hd tokens.
        background_color: '#FBF0E6',
        theme_color: '#1F1A17',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ttf,woff2,wav}'],
        navigateFallback: '/panel.html',
        // API and live socket are network-only: never serve stale orders from cache.
        navigateFallbackDenylist: [/^\/api\//, /^\/mockServiceWorker\.js$/],
        globIgnores: ['mockServiceWorker.js'],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'dist-panel',
    emptyOutDir: true,
    rollupOptions: { input: fileURLToPath(new URL('./panel.html', import.meta.url)) },
  },
  server: { port: 5175, strictPort: true },
  preview: { port: 4175, strictPort: true },
});
