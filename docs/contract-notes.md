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
5. **Guest browsing (decision D-59, approved).** Users browse without logging in; login is required only
   at checkout, orders, favorites and account. The contract's global `security: bearer` must be
   overridden with `security: [{}, {bearer: []}]` (token optional) on: `/home`, `/restaurants`,
   `/restaurants/{id}`, `/restaurants/{id}/menu`, `/foods/{id}`, `GET /foods/{id}/reviews`, `/search`,
   `/search/suggestions`, `/campaigns`, `/campaigns/{id}`, `/geo/zone-check`, `/promos` (public promos;
   personal ones when a token is sent), and `POST /checkout/quote` (price check before login).
   When a token is present the server may personalize (e.g. `isFavorite`).
6. **Payment return**: `/payments/callback/{provider}` redirects to the app with `?orderId=&result=`.
   The Android deep-link scheme / PWA return URL must be agreed (current Android scheme placeholder:
   `ir.dokoonapp.customer://`).
7. **Shared restaurant links**: the app shares `https://<app-origin>/?restaurant=<id>` (ids must match
   `^[\w-]{1,64}$`). If the backend later serves link previews (Open Graph) or Android App Links for
   `dokoonapp.ir`, it should use the same format.
8. **Order cancel / report lists.** `POST /orders/{id}/cancel` takes `reasonId` and `/report` takes
   `typeId`, but there is no endpoint listing them. The app uses fixed ids for now:
   cancel `mistake | too_slow | change | other`, report `missing | wrong | late | quality | other`.
   Proposal: `GET /orders/cancel-reasons` and `GET /orders/report-types` (id + Persian title), or
   enums in the contract. (The report photo uses the existing `POST /uploads` → `photoUploadIds`.)
9. **Payment callback query.** `/payments/callback/{provider}` declares no query parameters, while its
   summary says the server reads the gateway result and redirects with `?orderId=&result=`.
   Proposal: document the gateway's query params there (they differ per provider).
10. **Reorder lines.** `GET /orders/{id}/reorder` returns a `Quote`, whose lines have no option ids, so
    a reorder cannot restore chosen options (fries size, extras). Proposal: add `optionIds` to
    `Quote.lines` (and to `Order.lines`, see #2).
11. **Editing the mobile number** needs an OTP flow for the new number (e.g. `POST /me/phone/request`
    + `/verify`). Until then the app shows the number read-only.
12. **`/partner-requests` `extra` and `/uploads` body.** `extra` is declared as a bare `{type: object}`, which
    the generator turns into `Record<string, never>`; the app sends string fields there (restaurant:
    `business`, `address`; courier: `vehicle`, `area`). Proposal: `additionalProperties: {type: string}`
    or named optional fields. `POST /uploads` has no `requestBody`; the app sends `multipart/form-data`
    with one `file` field. Proposal: declare it (`multipart/form-data`, `file: string, format: binary`).
13. **Search filters and recent searches.** `GET /search` takes only `q`/`lat`/`lng`, so the shared
    FilterSheet cannot narrow search results on the server. The app filters the returned cards on the
    client (`openNow`, `hasDiscount`, `minRating`, `sort`); food-type `tags` cannot be applied because
    `RestaurantCard` has no tags, and the app tells the user. Proposal: accept the same filter params as
    `GET /restaurants` (`sort`, `openNow`, `hasDiscount`, `tags`, `minRating`) on `/search`. Also: no
    endpoint to save or clear the per-user `recent` list of `/search/suggestions`; the app keeps its own
    list per device (D-81). Proposal: `DELETE /search/recent` (and the server records `q` on `/search`
    for logged-in users). `/search` has no paging (`nextCursor`); fine for now, needed for big cities.
14. **Campaign restaurants and list totals.** `Campaign` has only `restaurantIds`, and there is no way to
    fetch several `RestaurantCard`s by id, so the campaign screen calls `GET /restaurants/{id}` once per
    participant (full `Restaurant` objects; ids that fail are skipped). Proposal: either embed
    `restaurants: RestaurantCard[]` in `GET /campaigns/{id}`, or accept `ids` on `GET /restaurants`.
    Also, `RestaurantPage` has no `total`, so the FilterSheet's «نمایش N رستوران» counts only the first
    page (≤ `limit`). Proposal: add `total: integer` to `RestaurantPage`.
