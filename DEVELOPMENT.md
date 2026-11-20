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
| `npm run lighthouse` | Lighthouse mobile on the URL entry points of a running `preview:perf` (budget: Performance & Accessibility ≥ 90); reports in `perf/results/` |
| `npm run android:debug` | Mock build → `cap sync` → `android/app/build/outputs/apk/debug/app-debug.apk` |

Android build needs `JAVA_HOME` (JDK 21) and `ANDROID_HOME` (Android SDK, platform 35).

Store release: push a tag `vX.Y.Z` on main. `cd.yml` refuses to build without the four `ANDROID_KEY*`
secrets and `vars.VITE_API_BASE_URL`, sets `versionCode = X*10000 + Y*100 + Z`, signs, runs
`apksigner verify` and attaches `app-release.apk` to the GitHub release. Everything else needed
before a public release is tracked in `docs/release-checklist.md`.

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
  panel/        restaurant panel (second entry, see below)
```

## Restaurant panel (second entry, D-91)

The restaurant app/panel (`panel.dokoonapp.ir`) lives in the same repo: `panel.html` → `src/panel/main.tsx`,
built by `vite.panel.config.ts` into `dist-panel/` with its own PWA manifest («دکون رستوران»), icons and
`robots.txt` from `public-panel/`. It reuses the shared code (`src/components`, `src/lib`, `src/theme`,
`src/errors`, `src/nav`, `src/ui`, `design-tokens/`, `assets/fonts`).

| Command | What it does |
|---|---|
| `npm run dev:panel:mock` | Panel on http://localhost:5175 with mock data |
| `npm run dev:panel` | Panel against `VITE_API_BASE_URL` |
| `npm run build:panel` / `build:panel:mock` | Typecheck + build into `dist-panel/` |
| `npm run e2e:panel` | Playwright for the panel (`e2e-panel/`, against a mock build on :5176) |
| `npm run secrets:scan:dist-panel` | Secret scan of the panel bundle |
| `docker build --build-arg APP=panel .` | Panel image (nginx `docker/nginx.panel.conf`); `docker compose up` serves it on :8081 |

- **Boundary:** ESLint rule `dokoon/app-boundaries` (`scripts/eslint-app-boundaries.mjs`): the panel may not
  import customer-only code (`app`, `screens`, `features`, `cart`, `auth`, `consent`, `mocks`, the customer
  API client/types), the customer app may not import `src/panel`, and shared code imports neither (only
  `import type` of customer contract types). Tests/stories are exempt.
- **Tokens:** restaurant delta tokens in `design-tokens/dokoon-restaurant-tokens.css`, scoped to
  `<html data-app="restaurant">`; they also repaint `--success`/`--okbg` to orange/soft so shared components
  never show green. `npm run lint:design` has a `no-green` rule for `src/panel`.
- **Not indexed:** `<meta name="robots" content="noindex, nofollow">`, `robots.txt` and an
  `X-Robots-Tag` header on every nginx response; CSP also allows `wss:` for the live orders socket.
- **API (KAN-56):** `src/panel/api/` — types generated from `restaurant/dokoon-restaurant-openapi.yaml`
  (`npm run api:gen:panel`), its own session (`dk-r-session`), rotating refresh, `Idempotency-Key` on order
  actions (kept for retries until a definite answer), and the shared HTTP layer for ErrorPage kinds.
  Inline errors via `businessError()` / `isAlreadyAnswered()` (409 from another device, D-96).
- **Mocks:** `src/panel/mocks/` — MSW handlers for every contract operation (checked against the contract
  schemas in `handlers.test.ts`), prototype sample data, a mock realtime stream (socket factory) and
  in-page mode for Android (D-71). Dev tools in mock builds:

  | localStorage / global | Effect |
  |---|---|
  | `dk-mock-status` = `503` | every GET fails with that status (error pages) |
  | `dk-mock-config` = `{"maintenance":true}` / `{"minVersion":"99.0.0"}` | maintenance / forced-update page |
  | `dk-mock-neworder-ms` = `30000` (`0` = off, default 90 s) | demo new order on the live stream |
  | `__dkPanelMocks.stream.dropAll()` | every device loses the live connection |
  | OTP `1234`; phones `09130000001/2/3` | pending / needs_docs / rejected registration |
- **Shell (KAN-58):** `src/panel/shell/` — `RHeader` (dark business header, open/closed switch), `RBottomNav`
  (bottom bar < 720, 104px side rail ≥ 720 via CSS), stack navigation from the shared `createStackNav`
  (`src/panel/nav/nav.ts`: tabs orders/menu/reports/account, exact back, Android back + «press again to exit»),
  full-page errors with panel actions, startup `/app/config` check. Mock builds: Account → error page previews.
- **Login (KAN-59):** `src/panel/auth/` (flow + validation) and `src/panel/screens/auth/`. Without a session the
  panel opens at `login`; after the code: `active` → `shift`, `pending`/`needs_docs`/`rejected` → `reg-status`,
  no restaurant (`new`) → `reg`. Mock: code `1234`; phones `09130000000` (new), `…01` pending, `…02` needs
  documents, `…03` rejected, any other valid phone = approved restaurant. E2E helper `e2e-panel/helpers.ts`
  (`seedSession`, `openPanel`) signs in and passes the shift screen.
- **Registration + uploads (KAN-60):** `src/panel/screens/reg/` (wizard, `DocsUploader`, needs-docs screen) and the
  shared upload tool `src/panel/upload/upload.ts` (type/size rule → `src/lib/image.ts` shrink → `POST /uploads`).
  Sheba checksum in `src/panel/auth/validation.ts`. Use the same tool for dish photos and the logo (KAN-67/70).
- **E2E locally:** `npm run e2e:panel` builds the mock panel and serves it on `127.0.0.1:5176`.

## Rules enforced in code
- Tokens only: components use `var(--…)` from `design-tokens/dokoon-tokens.css`; derived transparencies live in
  `src/styles/derived-tokens.css` (color-mix of existing tokens). ESLint flags hex colors in inline styles.
- Persian digits via `src/lib/format.ts` (`Intl.NumberFormat('fa-IR')`); inputs are normalized to ASCII.
- Dev-only: Settings → error page previews and mock failure injection (`localStorage dk-mock-status`).
