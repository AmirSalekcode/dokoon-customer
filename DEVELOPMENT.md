# Dokoon customer app — development

React 19 + TypeScript + Vite 8, PWA (vite-plugin-pwa / Workbox) and Capacitor 8 (Android).

## Commands

| Command | What it does |
|---|---|
| `npm run dev:mock` | App on http://localhost:5173 with the MSW mock API (no backend needed) |
| `npm run dev` | App against `VITE_API_BASE_URL` (real backend) |
| `npm test` | Vitest unit tests (API client vs. mock server, cart, nav, providers, view models) |
| `npm run e2e` | Playwright e2e at 390×844 (RTL, theme, back, overlays, cart, offline, errors) |
| `npm run lint` / `npm run typecheck` / `npm run format` | ESLint / tsc / Prettier |
| `npm run storybook` | Storybook on :6006 — 5 base + 39 library components, light/dark toolbar |
| `npm run api:gen` | Regenerate `src/api/schema.d.ts` from `contract/dokoon-openapi.yaml` |
| `npm run mock:prism` | Contract-only mock (Prism) on :4010, alternative to MSW |
| `npm run android:debug` | Mock build → `cap sync` → `android/app/build/outputs/apk/debug/app-debug.apk` |

Android build needs `JAVA_HOME` (JDK 21) and `ANDROID_HOME` (Android SDK, platform 35).

## Layout

```
src/
  api/          generated schema types, openapi-fetch client, HTTP layer (timeout, retry, 401 refresh, error kinds), useApi
  mocks/        MSW handlers + sample data (browser worker in mock mode, node server in tests)
  nav/          stack navigation, overlays, system back (Android/Capacitor + browser popstate), connectivity
  cart/         single shared cart (one restaurant) + confirm-replace flow
  errors/       ErrorPage content per kind + retry registry
  providers/    MapProvider (Neshan/Balad + fallback), PaymentProvider, PushProvider — interfaces + fakes
  theme/        light/dark, persisted in localStorage `dk-theme`
  components/   base/ (Button, TextField, Sheet, Dialog, Toast), library/ (39 from the component library), primitives/
  features/     API → component view models (all Persian formatting lives here)
  screens/      phase-1 demo screens only (home/restaurant/cart/account/settings lab); real screens come next
  app/          App shell: ScreenHost (keeps stack mounted for exact back), OverlayHost, BottomNav
```

## Rules enforced in code
- Tokens only: components use `var(--…)` from `design-tokens/dokoon-tokens.css`; derived transparencies live in
  `src/styles/derived-tokens.css` (color-mix of existing tokens). ESLint flags hex colors in inline styles.
- Persian digits via `src/lib/format.ts` (`Intl.NumberFormat('fa-IR')`); inputs are normalized to ASCII.
- Dev-only: Settings → error page previews and mock failure injection (`localStorage dk-mock-status`).
