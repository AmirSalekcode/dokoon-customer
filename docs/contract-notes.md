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
15. **No minimum order (owner decision D-89, 2026-11-20).** The owner removed the minimum order: any
    amount, even a single item, can be ordered from any restaurant. The app no longer reads
    `RestaurantCard.minOrder`, `Quote.minOrder` or `Quote.belowMinBy`, and never shows a minimum.
    Proposal: remove those three fields and the `MIN_ORDER` error code from the contract, and make sure
    `POST /checkout/quote` and `POST /orders` never reject an order for being below a minimum.


## Restaurant contract (`restaurant/dokoon-restaurant-openapi.yaml`)

16. **Domains (D-90).** `servers` and the WebSocket URL still use `api.dokoon.example`; the approved
    domain is `dokoonapp.ir` (D-52) → `https://api.dokoonapp.ir/v1` and `wss://api.dokoonapp.ir/v1/r/stream`.
    CORS: `https://dokoonapp.ir`, `https://panel.dokoonapp.ir` (admin on `admin.dokoonapp.ir` separately).
17. **Courier call (D-100).** `Order.courier.canCall` exists but there is no way to get a number.
    Proposal: `POST /r/orders/{id}/courier-call` → `{ phone: string, expiresAt: date-time }` returning a
    short-lived Dokoon proxy number (never the courier's real number). Until it exists the panel hides
    the call button.
18. **ETA (D-93).** The server computes the customer ETA: `etaMin = prepMinutes + route minutes`,
    `etaMax = etaMin + 10`. No restaurant-side field is needed; `Order` could expose `customerEtaText`
    for the order detail if wanted.
19. **Cash settlement (D-94).** The courier hands cash to Dokoon; restaurants never hold cash.
    `netPayable = onlineSales + cashSales − commissionAmount`, commission on the whole food total.
    `Settlement.note` can then be removed or kept as free text.
20. **Multiple devices (D-96).** One manager account may be signed in on several devices at once.
    `order.created` must reach every connected device; accept/reject on an order already answered must
    return `409` with code `ALREADY_ANSWERED` so the other devices can close their alert.
21. **Uploads.** Registration documents and dish photos use the customer contract's `POST /uploads`
    (presigned). The restaurant contract should reference it (or define `/r/uploads`) so the generated
    panel client has it; dish photo limit jpeg/png/webp ≤ 5 MB (D-99).
22. **App config per app (D-106).** `GET /app/config` has one `minVersion` and one `maintenance`, but
    customer and restaurant apps ship separate versions. Proposal: `GET /app/config?app=customer|restaurant`
    (or `minVersion: {customer, restaurant}`), and let `maintenance` be per app too. Until then both apps
    read the same fields.
23. **Realtime frame and idempotency (KAN-56).** `x-realtime` names the events and payloads but not the
    frame. The panel expects one JSON text frame per event: `{"event": "order.created", "data": {…}}`.
    Order actions (`accept`, `reject`, `ready`, `handover`, `extend`) send an `Idempotency-Key` header
    (UUID v4, reused when the same action is retried after a timeout/5xx); the contract should declare it
    and the server should return the first result for a repeated key.
24. **Reject vs cancel from another device (D-96).** `POST /r/orders/{id}/reject` both rejects a `new`
    order and cancels a `prep` one. If device A accepts and device B (still showing the alert) taps
    reject, the server would *cancel* the just-accepted order. Proposal: a separate
    `POST /r/orders/{id}/cancel` for prep orders, so `reject` on an order that is no longer `new` returns
    `409 ALREADY_ANSWERED`. The mock already treats a second accept as `ALREADY_ANSWERED`.
25. **Undeclared error responses.** The mock (like a real server) returns `400` for invalid
    `prepMinutes`/`addMinutes`/`reasonId`, `PUT /r/settings` with `etaMax < etaMin`, `PATCH /r/me` with a
    short name/address, and `400`/`429` on OTP verify; these statuses should be added to the contract.
    Stream: a connection without a valid ticket is closed with code `4401`.
