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
26. **Login for a phone without a restaurant (KAN-59).** `RestaurantAuth.status` and
    `RegistrationStatus.status` have no value for "this phone has no restaurant yet", so after the OTP the
    panel cannot tell a new manager from an approved one. Proposal: add `new` to both enums; the panel
    sends `new` (and a missing `status`) to the registration wizard, `pending`/`needs_docs`/`rejected`
    to the status page and `active` to the shift screen. Registration then runs with the token of the
    verified phone (so `POST /r/registration` and the document uploads are authenticated and bound to
    that phone) instead of `security: []`. Declare `429` on `/r/auth/otp/verify` too.
27. **Report trends (KAN-68).** `Report.deltas` are free texts («۱۲٪ بیشتر از دیروز»), so the panel cannot
    colour a stat card as better/worse without parsing words (and must not compute it, D-94/D-95).
    Proposal: `Report.trends: {revenue|orders|avgOrder|avgPrepMinutes: 'up' | 'down' | 'flat'}` where
    `up` means better for the restaurant (for prep time: faster). Until then the cards show the text
    without colour. Also declare `400 PERIOD_INVALID` on `GET /r/reports`.
28. **Sheba-change code (KAN-70).** `POST /r/me/sheba-change` needs a fresh `otpCode`, but the only way to
    get one is `POST /r/auth/otp/request {phone}`, and the panel never holds the full phone
    (`phoneMasked`). Today the manager types the mobile again. Proposal:
    `POST /r/me/sheba-change/otp` (no body, bearer auth) → `{resendAfterSec, codeLength}`, sent to the
    account's own phone; the server must reject a code that was sent to any other number.

29. **Settlement lines for accounting (KAN-75).** Restaurants download each settlement as PDF (server
    invoice) and Excel; the Excel is built in the panel from `Settlement` totals only, because the contract
    has no per-order breakdown and the panel must not compute money (D-94). Proposal:
    `GET /r/settlements/{id}/lines` → `[{orderId, no, placedAt, payment: online|cash, foodTotal,
    commissionAmount, netAmount}]` (server-computed), or `GET /r/settlements/{id}/invoice?format=xlsx`
    returning the same as a spreadsheet. The panel adds the lines as a second sheet when available.


## Courier contract (`courier/dokoon-courier-openapi.yaml`, KAN-86)

30. **Session: cookie on the web, token in the app.** The courier security checklist says «HttpOnly cookie
    on the web, Keystore on Android, never localStorage», but `/c/auth/verify` returns only `Me` and the
    contract declares bearer auth only. The client sends `X-Dokoon-Client: courier-web | courier-android`
    on every request. Proposal: for `courier-web`, verify answers with
    `Set-Cookie: dkc_session=…; HttpOnly; Secure; SameSite=Strict; Path=/` and no token in the body (the
    server accepts the cookie on every `/c/*` call, the web client sends `credentials: 'include'`); for
    `courier-android`, the body is `Me & {accessToken}` and the app keeps it in the Keystore. Declare the
    cookie as a second security scheme (`cookieAuth`) and the header as a parameter. CSRF: SameSite=Strict
    plus the required custom header (a cross-site write then always needs a CORS preflight); CORS for
    `https://courier.dokoonapp.ir` with credentials. Offer and order actions (`/c/offers/{id}/accept|reject`,
    `/c/orders/{id}/stage|withdraw|issue|unreachable|deliver`) send an `Idempotency-Key` (UUID v4, kept for
    a retry after a timeout/5xx, as in note 23); the server should return the first result for a repeated
    key — especially for `deliver`, so cash is never booked twice.
31. **Phone without a courier account.** `Me.status` has `pending | approved | suspended` but no value for
    "not registered" or "rejected", so after the OTP the app cannot tell whether to open registration or the
    waiting page. Proposal: add `new` (the mock returns it for demo phone `09120000001`) and `rejected` with
    a `rejectReason` (then the app shows the reason and lets the courier fix and resubmit). Also state that `POST /c/registration`,
    `GET /c/doc-types` and `POST /c/documents/{type}` run with the session of the verified phone.
32. **Refresh and logout.** There is no refresh or logout endpoint. Today the client treats any `401` on a
    signed-in call as the end of the session (e401 page → login) and «خروج» only forgets the app token —
    on the web the HttpOnly cookie cannot be removed by the page. Proposal: `POST /c/auth/refresh`
    (rotating; cookie on the web, `{refreshToken}` in the app) and `POST /c/auth/logout` (clears the
    cookie / revokes the token). The client does not call either until they are in the contract.
33. **Live offers (WebSocket).** The screen-specs say «WS offers» but the contract has no `x-realtime`.
    Proposal (same frame as note 23, one JSON text frame per event `{"event", "data"}`):
    `wss://api.dokoonapp.ir/v1/c/stream`, authenticated by the cookie on the web and by a one-time ticket
    in the app (`POST /c/stream/ticket` → `{ticket, expiresInSec}`, as `/r/stream/ticket`). Events:
    `offer.created` (`Offer`, only to online and free couriers near the restaurant), `offer.gone`
    (`{offerId, reason: taken | expired | cancelled}`, to every courier who saw it), `order.updated`
    (`ActiveOrder`, e.g. the restaurant marked it ready) and `order.cancelled` (`{orderId, reason}`).
    The mock stream (`src/courier/mocks/stream.ts`) implements exactly these.
34. **Untyped responses.** `GET /c/orders/history`, `GET /c/earnings`, `GET /c/settlements` and
    `PUT /c/status` declare no body. The app and the mock use (see `src/courier/api/types.ts`):
    history `{items: [{id, no, rest, toArea, deliveredAt, km, earn, cash, cashCollected?}], nextCursor?}`;
    earnings `{period, total, trips, hours, avg, balance, cashHeld, chart: [{label, amount}]}` (all
    server-computed integers; the cash rule is undecided, so the app never computes money);
    settlements `[{id, periodStart, periodEnd, amount, status: paid | pending, paidAt?, shebaMasked}]`;
    `PUT /c/status` → `{online}`. A history detail screen also needs the items and the restaurant
    address of a past trip (`GET /c/orders/history/{id}`, or the same fields in the list).
35. **Sheba change body.** `POST /c/sheba-change` has no request body. It needs `{sheba, otpCode}` and a
    way to send the fresh code to the account's own phone (same proposal as note 28:
    `POST /c/sheba-change/otp`). `Me` should also carry `nationalIdMasked` and `shebaMasked` for «اطلاعات
    من» (the app must never receive the full Sheba).
36. **Support and map data.** The support page needs the city manager's call number and the FAQ, and
    calling the customer/restaurant should go through a proxy number (open decision «safe-call number»),
    but the contract has neither: proposal `GET /c/support` → `{cityManagerPhone, supportPhone, faqs:
    [{q, a}]}` and `POST /c/orders/{id}/call` → `{phone, expiresAt}` (like note 17). `ActiveOrder` has
    addresses but no coordinates, so the Neshan/Balad deep links can only search by text: add
    `restLat/restLng/custLat/custLng`. Also note `withdraw` and `issue` take a free-text `reason`; the app
    shows fixed reason lists from the prototype until a `GET /c/reasons` exists.
37. **Error body and undeclared statuses.** The courier contract has no error schema. The client and mock
    use the restaurant `ApiError` shape `{code, message, fields?}`. Codes the app reacts to: `OTP_INVALID`
    (verify `401` — the app keeps it on the login screen; a `400` would be more consistent with the other
    apps), `RATE_LIMITED` (`429`), `OFFER_TAKEN` / `OFFER_EXPIRED` (accept `409`, first courier wins),
    `ACTIVE_ORDER` (`PUT /c/status` offline `409`, and accept while busy), `WITHDRAW_CLOSED` (`409`),
    `VALIDATION` with `fields` (registration `422`). Undeclared statuses the mock returns like a real server:
    `401` on every signed-in path without a session, `403 NOT_APPROVED` (status/offers/orders for a
    pending or suspended courier), `400` for a bad phone, missing reason, bad location, unchecked items
    (`ITEMS_UNCHECKED`, leaving pickup), missing cash amount (`CASH_REQUIRED`), bad cursor/period,
    `404` for an unknown offer/order/document type, `409 INVALID_STAGE` (skipping a stage) and
    `409 NOT_TRACKING` (location while offline with no active order, courier rule 3), `413` for a large
    document. Also: `servers` is `/api`; the other contracts use `/v1` (`https://api.dokoonapp.ir/v1`),
    which the client uses too.

38. **Document rules and registration resume.** Courier `DocType` is `{id, label, sub, required}` with no
    type/size rule (the restaurant one has `accept` and `maxMb`, D-99). The app allows JPG/PNG/WebP/PDF up to
    10 MB (photos are shrunk to 1600 px first) until the server sends `accept`/`maxMb`. The registration
    documents are sent one by one with `POST /c/documents/{type}` before `POST /c/registration`, which has no
    `docs` field; please state that the server links the documents of the session's phone to the request.
    `Me.docs` of a `new` courier should list what was already sent, so a courier who leaves the wizard can
    resume. The mock answers `422 VALIDATION` with `fields.nationalId` for a national code that already
    belongs to another courier (demo `1234567891`).

## Food discounts / festival (D-131, Epic KAN-107)

39. **Per-food discount.** Restaurants set a discounted price per food; customers see the old price struck
    through and a «X٪ تخفیف» / «جشنواره X٪» badge.
    - **Restaurant contract** (our draft, updated in KAN-108): `Food` and `FoodInput` get
      `discount: {price: integer, label: 'special' | 'festival', endsAt: date-time | null} | null`.
      `price` is the base price. `oldPrice` is deprecated: the panel stops sending it.
      Server rules: `1 ≤ discount.price < price`, percent between 1 and 90, and `endsAt` in the future or
      null. At `endsAt` the server removes the discount itself. Changing `price` revalidates the discount
      (409 `DISCOUNT_INVALID` if it is no longer below the price).
    - **Customer contract** (proposal for the backend): `Food.price` = the price the customer pays now,
      `Food.oldPrice` = the base price while a discount is active (null otherwise), and a new
      `Food.discount: {percent: integer, label: 'special' | 'festival', endsAt: date-time | null} | null`.
      `GET /restaurants?hasDiscount=true` and `RestaurantCard.badge` («تا ۲۵٪ تخفیف») should include
      restaurants with an active food discount. `POST /checkout/quote` always uses the discount that is
      valid at quote time and reports `PRICE_CHANGED` when one ended since the cart was filled.
    - Commission is computed on the price after the discount; the restaurant pays for the discount.

## Courier app — online and offers (Epic KAN-78)

40. **Online state after a restart.** `PUT /c/status` sets online/offline, but nothing returns the current
    state (`Me` has no `online`), so after a reload or app restart the client cannot tell whether the server
    still lists the courier as online. The app (KAN-93) starts every session as offline in the UI and does not
    track. Proposal: add `online: boolean` to `Me`, and let the server set a courier offline by itself when no
    `POST /c/location` arrives for a while (the client reports at least once a minute while online or with an
    active order, more often while moving: ≥10 s apart and ≥30 m moved). `POST /c/location` while neither
    online nor on an order should be refused (`409 NOT_TRACKING` in the mock). Sign-out sends
    `PUT /c/status {online:false}` when the courier is online without an order.
