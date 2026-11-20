# Dokoon (دکون) — Customer App Frontend

Persian food-delivery app. **Scope now: customer app only** (restaurant, courier, admin apps are later).
Owner is Persian-speaking; talk to the owner in Persian, keep code/comments/commit messages in English.

## Stack (approved)
One web app (React + TypeScript + Vite) that works as a **PWA** (iPhone users) and is wrapped with **Capacitor** for an Android APK (Bazaar, Myket, direct download). NOT Flutter. Phase 1 has no iPhone-native app.

## Source of truth (read before coding a screen)
- `docs/dokoon-screen-specs.md` — behavior of every screen (entry/exit, data, states, validation)
- `docs/dokoon-design-system.md` + `design-tokens/` — colors (light+dark), type, spacing, radii, sizes, motion
- `docs/dokoon-component-library.md` — 40 shared components, props, usage
- `contract/dokoon-openapi.yaml` — API contract (backend is built by someone else in parallel). Never invent endpoints; propose contract changes in a PR/note.
- `docs/dokoon-screen-map.md`, `docs/dokoon-context.md`, `docs/dokoon-ui-architecture.md` — product context; where old text conflicts with the screen-specs/changelog at the bottom of each file, the changelog (v48) wins.
- `prototype/*.dc.html` — the visual reference from Claude Design (open `App.dc.html` as code to read data and logic). It is a reference, not production code. Fonts/logos are in `assets/`.

## Permanent rules
1. Responsive, base frame 390×844 (content 358 wide, 16px gutters); never break this layout.
2. Persian UI, native RTL (`dir="rtl"`, logical CSS properties), Persian numerals everywhere (format with `Intl.NumberFormat('fa-IR')`; money = integer toman + «تومان»). Normalize Persian/Arabic digits on input.
3. Font **Yekan Bakh** everywhere (weights 300/400/500/700/800). Commercial licence is being purchased; do not publish publicly before it is confirmed.
4. Use only design tokens (`--bg --sf --ink --mu --ln --soft --pr2 --primary …`). No hard-coded colors/spacings in components. Light + dark themes with a switch (stored in localStorage `dk-theme`, wrapped in try/catch).
5. Components are shared and data-driven: no hard-coded names/prices/images inside components. One shared cart (single restaurant); adding from another restaurant asks for confirmation.
6. Every screen has defined entry/exit; **back returns to the exact previous screen** (also Android back). Overlays: only one at a time.
7. Greeting: «سلام (name) عزیز». Delivery time is **set by the restaurant** (`etaMin/etaMax`) and only displayed — user never selects it; no «هرچه زودتر», no scheduling.
8. Payments: online gateway (Zibal or ZarinPal behind a `PaymentProvider` interface) and cash on delivery (`allowCash` per restaurant). The courier collects cash.
9. Maps: `MapProvider` interface with **Neshan** and **Balad**; user picks one when the map opens, fall back to the other if one fails; store coordinates, not provider ids. Verify each provider's terms/keys before relying on them.
10. Push: `PushProvider` abstraction (FCM may be blocked in Iran; alternative TBD). iPhone Web Push only works iOS ≥16.4 when installed.
11. Every list/screen implements loading / empty / error / offline states; errors map to full-page ErrorPage kinds (offline, 401→login, 403, 404, 500, 503, 504).
12. Accessibility: touch targets ≥48px, aria labels on icon buttons, `prefers-reduced-motion`, visible focus.
13. Never claim a feature works unless you ran it (unit/e2e test or real browser). Report what is done and what remains. Before changing architecture or design-system decisions, warn the owner first.

## Workflow per screen
Read its spec → reuse components → define data/states/actions → implement → test (RTL, dark, 390×844, offline/error) → update docs/changelog if behavior changed → report done/remaining.

## Out of scope for now
Wallet (open decision), live courier map, favorite foods, restaurant reviews, restaurant/courier/admin apps, domain/store accounts.

## Restaurant app/panel (added)
Scope: restaurant app + web panel (`panel.` subdomain), same codebase/backend/design system as the customer app. Docs in `restaurant/`: screen-specs, component-library, design-system (delta), openapi (contract), security-checklist. Visual reference: `prototype-restaurant/` (unverified Claude Design prototype).
Rules specific to this app:
1. **No green** anywhere (on = orange `#E4501E`, off = grey). Status colors per `restaurant/dokoon-restaurant-design-system.md`.
2. Customer phone and restaurant Sheba are always **masked** (server masks). Sheba change = fresh OTP + admin review.
3. Commission is **read-only** for restaurants (default 12%, admin-editable, stored per settlement). Cash-settlement rule is still undecided: show sample numbers only, never invent final logic.
4. Registration documents are **data-driven** (`GET /r/doc-types`); never hardcode the list.
5. Dish photos need admin approval (`pending/approved/rejected`); show default art until approved.
6. New orders arrive over WebSocket with a full-screen alert, 3-minute timer, repeating sound. Browsers need a user gesture for audio → the «شروع شیفت» screen. iOS PWA cannot guarantee loud alerts (recommend Android for restaurants).
7. Responsive: phone <720 = bottom tabs, ≥720 = side rail + list/detail split. Use CSS media/container queries (the prototype's generated `AppTablet` copy is not a pattern to copy).
8. Formerly open items are decided in `.cloud/decisions.md` D-90…D-104 (domain `panel.dokoonapp.ir`, Android `ir.dokoonapp.restaurant`, ETA, cash settlement, multi-device, printing, sound/push, uploads, courier call, holidays, history filter, wallet, load testing). Still open: D-49, D-50, D-51, D-54. Do not decide anything else silently.
