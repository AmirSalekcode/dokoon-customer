# Contract notes from the frontend (phase 1)

Proposed changes to `contract/dokoon-openapi.yaml`, found while generating the TypeScript client.
Nothing here is implemented as an invented endpoint; the frontend works around each gap for now.

1. **Almost no `required` fields.** `RestaurantCard`, `Food`, `Order`, `User`, `City`… mark every property
   optional, so the generated types are `id?: string` everywhere and the app needs `!`/fallbacks.
   Proposal: mark ids, names, prices, `etaMin/etaMax`, `fee`, `minOrder`, `open`, `status` as required.
2. **`Order.lines` items are untyped** (`{type: object}` → `Record<string, never>`).
   Proposal: `OrderLine {foodId, title, qty, unitPrice, total, options: [{id, title, priceDelta}]}`.
   Same for `Order.recipient` and `Support.contacts`.
3. **No illustration field.** The prototype uses art ids (`dk-burger`…); the contract only has
   `imageUrl`/`coverUrl`. Mocks pass `art:dk-*` inside `imageUrl`; the `Art` component renders either.
   Proposal: keep only real image URLs in production (no change needed) — confirm with the owner.
4. **`Error.details`** is `{type: object}` without properties (typed as `Record<string, never>`).
   Proposal: `additionalProperties: true`.
5. **Search suggestions** (`/search/suggestions`) has no `security` override — fine if it is per user;
   for guests it should allow anonymous access (guest-browsing decision is still open).
6. **Payment return**: `/payments/callback/{provider}` redirects to the app with `?orderId=&result=`.
   The Android deep-link scheme / PWA return URL must be agreed (current Android scheme placeholder:
   `ir.dokoon.customer://`).
