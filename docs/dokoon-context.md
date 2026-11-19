# Dokoon (دکون) — Project Context & Chat Summary

_Formerly "Shahreza Food" (شهرضافود). Renamed on Nov 12, 2026._

> Source: shared Claude chat (shared by **Amir**), https://claude.ai/share/7a88a366-b565-44a2-be38-636b812aa2ae
> Also includes the two docs made in that chat, translated in full: "سیستم طراحی شهرضافود" (Design System, 7 pp.) and "نقشه صفحات شهرضافود" (Screen Map, 8 pp.), both by Amir, Nov 11, 2026.
> Original language: Persian. This is an English translation and structured summary, made so it can be loaded as context in a new session.
> Status when the source chat ended (before the Nov 12 updates): the system-design doc and the screen-map doc were done. Work had started on interactive prototypes of the customer app, but the last response failed to load.

---

## 0. Latest decisions (updated Nov 12, 2026), which override anything below

| Topic | Decision |
|---|---|
| Brand name | **دکون (Dokoon)**, a colloquial word for "shop". One umbrella brand for every city, with city selection inside the app. Domains to check: `dokoon.ir`, `dokkoon.ir` |
| v1 scope | **Restaurants only, per city.** Supermarket, pharmacy and other shop types come later (super-app) |
| Expansion | Shahreza first, then Nain, Jam and other small towns |
| Visual style | **The colors and style of the new reference mockup** (warm orange-red on cream, see §4). This replaces the earlier orange/navy palette and the lapis/saffron proposal |
| Backend architecture | **Modular monolith + DDD + CQRS**, using **MediatR** and **thin controllers**, on **.NET 10 LTS / ASP.NET Core Web API** (see §3.1) |
| Database | **PostgreSQL + EF Core 10** (Npgsql), with base-class **inheritance** for entities and EF Core inheritance mapping (see §3.4) |
| Security | Security by design on both sides: OWASP Top 10 / API Top 10 / MASVS, SQL-injection prevention, and penetration testing before launch (see §3.5) |
| Frontend architecture | **Component-driven** Flutter (see §3.2) |
| Process | **TDD on both sides.** Tests are always written first, the code comes after, and every test must be green. One person does the frontend, one does the backend (see §3.3) |
| Code principles | **SOLID, DRY, Clean Code** |
| Logo | Four black-and-white concepts made in ChatGPT. The favourite is the **Persian bazaar arch with a steaming cloche** inside. Next step: vectorise it and add the Persian «دکون» wordmark in Yekan Bakh (see §12) |
| Screen map | **123 screens** (103 in the MVP), in a separate file: `dokoon-screen-map.md` |

## 1. The idea

- A food ordering and delivery platform, now called **Dokoon (دکون)**, originally "Shahreza Food". Think of it as a small, local SnapFood for small Iranian towns, starting with Shahreza.
- **v1 = restaurants of each city only.** Later it becomes a local super-app with supermarkets, pharmacies (non-prescription and health products first, after a legal check) and other shops. The data model should already be generic: a "vendor" with a type (restaurant / supermarket / pharmacy) and a "catalog" rather than a menu.
- The founder (Amir) started out solo and wanted AI to do almost all the UI design and coding. **No Figma**: AI generates the screens directly.
- Top priorities: **very high speed and smoothness**, **strong security**, and **world-class UI/UX**.
- Competitive edge: **a lower commission than competitors**, being local, and closer relationships with restaurants.
- Three roles: **customers**, **restaurants** and **motorbike couriers**. Together they cover the whole cycle, from choosing food to delivery at the door.
- Restaurants in Shahreza currently take orders by **phone, messaging apps and SnapFood**. Dokoon will be one channel among several, so restaurant alerts must be fast and loud, and accepting an order must be simple.

## 2. Team & workflow

- **Two developers, one per side:** one person owns the **frontend** (UI/UX, screen design, Flutter apps) and one owns the **backend**. Each uses their own Claude Code subscription.
- **Amir**: frontend, UI/UX and screen design.
- **A friend**: backend. The friend has backend experience and already uses Claude Pro/Claude Code.
- Agreed working rules:
  - Write the **API contract first** (every endpoint with exact inputs and outputs) before either side codes.
  - Use one shared **Git repo** with a branch per person.
  - Keep the **design-system doc** and the **API contract** inside the repo so both Claude Code instances read them.
  - Make a **written financial and legal agreement** between the partners: equity, code and name ownership, and responsibilities.
  - Get an external security review of payments, auth and role access **after the MVP and before the public launch**.
- Plan / cost notes: Pro includes Claude Code, with a 5-hour usage cap and a weekly cap shared with chat. A large project may hit the caps; the options then are to wait, buy extra usage or move to Max. Payment and access from Iran were not verified and must be checked by the founder.

## 3. Final technical architecture

| Layer | Decision |
|---|---|
| Mobile apps | **Flutter**, chosen over PWA + Capacitor because native speed and smoothness are top priority |
| App structure | **3 separate Flutter apps** (customer, courier, restaurant) + **1 shared package** (theme, components, API client). **Component-driven** |
| Android | Full native apps. Distribution: Cafe Bazaar, Myket and a signed APK as a direct download |
| iPhone | **Flutter Web as a PWA** ("Add to Home Screen"). Native iOS is shelved because of the Apple Developer account, payment and sanctions issues. Iranian iOS stores (e.g. Sibapp/Sibche) are a possible later route |
| Backend | **.NET 10 modular monolith + DDD + CQRS (MediatR)** on **PostgreSQL + EF Core 10**, on an **Iranian server** (ArvanCloud, IranServer, ParsPack…). The database must stay in Iran so the app survives international internet shutdowns |
| Push notifications | Iranian services (**Pushe** or **Najva**), not FCM. Flutter plugin support still needs checking |
| Maps | **Neshan** or **Balad**. Flutter plugin support still needs checking |
| SMS / OTP | Kavenegar, Melipayamak or similar |
| Assets | Self-host the fonts and libraries. No external CDN, no Google Fonts |
| Backups | Daily, kept in two separate Iranian locations |
| Security basics | Secrets in environment variables, row-level access rules, automated tests, Git for every working step |

### 3.1 Backend: .NET modular monolith + DDD + CQRS (MediatR, thin controllers)

**Stack:**
- **.NET 10** (current LTS, released Nov 2025, supported to Nov 2028)
- ASP.NET Core Web API
- **MediatR**
- **EF Core 10 + Npgsql** on **PostgreSQL**
- FluentValidation
- xUnit for tests
- Mapping: **AutoMapper** (the user's preference), or **Mapperly** (a free, source-generated mapper) as an option

**Licence note:** MediatR (v13+) and AutoMapper (v15+) are now **dual-licensed** (RPL-1.5 or commercial). A **free Community licence** covers companies under **US$5M gross annual revenue**. Register for it and add the licence key, or pin MediatR 12.5 / AutoMapper 14 (the last versions under the old licences), knowing those get no new fixes.

**Why a modular monolith:** one deployable app, split into modules (one per bounded context). One person runs the backend, so it's simpler to deploy, debug and keep consistent than microservices. A module can be split out later.

**Modules (bounded contexts) for v1:**

| Module | Responsibility |
|---|---|
| Identity | Mobile + OTP sign-in, roles (customer, restaurant owner/staff, courier, city admin, super admin), sessions, refresh tokens |
| Cities | City records and config: map centre, delivery zones, commission %, fee rules, working hours |
| Vendors (Restaurants) | Profile, approval, catalog (menu), items and options, hours, open/closed, courier type. Generic so supermarkets and pharmacies fit later |
| Ordering | Cart → order, the **8-state lifecycle**, rules and timeouts (3-min restaurant reply, 5-min no-courier alert, 15-min payment window) |
| Payments | A payment **port** with a pluggable online gateway adapter. Idempotent, with an audit trail |
| Delivery | Courier registration and approval, assignment, status steps, distance-based fee. Providers behind a port: our courier, the restaurant's courier, later taxi agencies and Snapp |
| Promotions | Discount codes, banners, paid placements (ads), per city |
| Wallet | Only if kept in v1 (open) |
| Notifications | SMS/OTP and push (Pushe/Najva) adapters |
| Settlement & Admin | Settlements, support tickets, admin roles scoped by city, audit log |

**Solution layout:**

```
src/
  BuildingBlocks/            shared kernel: base classes, Result, errors, MediatR behaviours, EF base, security helpers
  Host/Dokoon.Api/           composition root: Program.cs, auth, middleware, rate limits, OpenAPI, health checks
  Modules/
    Ordering/
      Ordering.Domain/          aggregates, entities, value objects, domain events, domain errors (no EF, no ASP.NET)
      Ordering.Application/     commands, queries, handlers, validators, DTOs, ports (interfaces)
      Ordering.Infrastructure/  OrderingDbContext (own schema), configurations, repositories, adapters
      Ordering.Api/             thin controllers (or endpoint groups) for this module
      Ordering.Contracts/       public integration events and module facade, the ONLY thing other modules reference
    Identity/ Cities/ Vendors/ Payments/ Delivery/ Promotions/ Notifications/ Settlement/ ...
tests/
  <Module>.Domain.Tests  <Module>.Application.Tests  <Module>.Integration.Tests
  Architecture.Tests     Api.Contract.Tests  Security.Tests
```

**CQRS with MediatR:**
- **Commands** change state: `PlaceOrderCommand`, `ConfirmCardTransferCommand`. They go through the domain model and are saved in one transaction.
- **Queries** only read: `GetRestaurantMenuQuery`. They use `AsNoTracking()` projections straight to read DTOs, never the aggregates. Read models can later move to views or a read replica.
- **One handler per request.** Handlers are small and testable, and depend on ports, not concrete classes.
- **Pipeline behaviours** (`IPipelineBehavior<,>`), in order:
  1. Logging and correlation ID
  2. Validation (FluentValidation)
  3. Authorization (requirement attributes on requests)
  4. Unit of Work / transaction for commands only
  5. Performance warning for slow requests
- Domain events are raised in aggregates and dispatched after `SaveChanges` (outbox for integration events between modules).
- **Errors:** handlers return a `Result<T>` with typed errors, not exceptions for expected failures. One middleware maps them to **RFC 7807 ProblemDetails**.

**Thin controllers:**
- A controller only maps HTTP to a command or query, calls `ISender.Send(...)` and maps the `Result` to an HTTP response. No business logic, no DbContext, no repositories.
- All controllers inherit from **`ApiControllerBase`**, which holds `ISender`, the Result → `IActionResult` mapping, and common attributes (`[ApiController]`, `[Authorize]` by default, route prefix `api/v{version}`).
- Example shape:

```csharp
/// <summary>Order endpoints for customers.</summary>
[Route("api/v1/orders")]
public sealed class OrdersController : ApiControllerBase
{
    /// <summary>Places a new order from the current cart.</summary>
    [HttpPost]
    [EnableRateLimiting("orders")]
    public async Task<IActionResult> Place(PlaceOrderRequest request, CancellationToken ct)
        => ToActionResult(await Sender.Send(request.ToCommand(CurrentUserId), ct));
}
```

**Code rules from the user's preferences:**
- XML doc comments on all methods.
- No Persian text anywhere in code; Persian UI strings live in resource files on the client.
- TDD: test first, then code, until green.
- DDD without over-engineering.

**Module boundaries:**
- A module talks to another only through its **Contracts** project (facade or integration events). It never touches another module's tables.
- Each module has **its own DbContext and PostgreSQL schema** (`ordering`, `vendors`, ...).
- Cross-module flows go through events, e.g. `PaymentConfirmed` → Ordering sends the order to the restaurant.
- **Architecture tests** (NetArchTest or ArchUnitNET) fail the build on any forbidden reference.

**Multi-city:**
- Every city-scoped aggregate implements `ICityScoped` (it has a `CityId`).
- A global EF Core query filter limits city admins to their own city.
- Permissions are always checked **on the server**.

### 3.2 Frontend: component-driven Flutter

- **Shared package (`dokoon_ui`)** holds the design tokens (colors, typography, radii, spacing, shadows) and every reusable widget. All three apps use it.
- **Build from small to large:**
  - Basic widgets first: buttons, chips, badges, icon buttons, price text, rating.
  - Then composite widgets: search bar, category chip, item card, restaurant card, hero banner, promo banner, bottom bar.
  - Screens only **compose** these components.
- **Component rules:**
  - Each component is isolated, takes its data as parameters, is stateless wherever possible, and has a single responsibility.
  - No hard-coded colors, sizes or strings inside components or screens. Use the tokens, and keep UI text in localization (ARB) files.
- **Folders:** each app is organized by feature (home, restaurant, cart, checkout, orders, account), with each feature split into presentation, state and data.
- **API client** lives in the shared package and follows the API contract. The state-management library is not decided yet.

### 3.3 TDD and code standards (both sides)

- **TDD is mandatory: Red → Green → Refactor.**
  1. Write the test first.
  2. Run it and see it fail.
  3. Write the minimum code that makes it pass.
  4. Run the tests until **all are green**.
  5. Refactor with the tests still green.
- No code is written before its test, and nothing is merged while any test is red. CI runs the full test suite on every push and PR as a gate.
- **Backend tests:**
  - Unit tests for the domain: aggregates, value objects and rules such as order state transitions and payment expiry.
  - Application tests for use cases, with fake ports.
  - Integration tests per module, against a real PostgreSQL.
  - Contract tests against the API contract.
  - Architecture tests that enforce module boundaries.
- **Frontend tests:**
  - Unit tests for logic, state and formatters (Persian digits, toman, Jalali dates).
  - A widget test for every component.
  - Golden (screenshot) tests for key components and screens, so visual drift is caught.
  - Integration tests for the main flows: sign-in → order → payment → tracking.
- **Principles:** SOLID, DRY and Clean Code:
  - Small functions and classes with clear names.
  - No magic numbers or strings.
  - Dependencies point inward, toward the domain.
  - Depend on interfaces, not concrete classes.
  - No duplicated logic.
  - Code identifiers in English.
- **Instruction for Claude Code (both developers):** always write the failing test first, run it, then write the code, and keep running the tests until they're all green before moving on. Never skip or delete a test to make the build pass.

### 3.4 Database: PostgreSQL + EF Core 10, inheritance

**Base-class inheritance (BuildingBlocks), used by every module:**

| Base type | Gives |
|---|---|
| `Entity<TId>` | Strongly typed ID (e.g. `OrderId` as a `record struct`), equality by ID |
| `AggregateRoot<TId> : Entity<TId>` | Domain-event list (`Raise`, `ClearEvents`), concurrency version |
| `AuditableEntity<TId> : Entity<TId>` (or `IAuditable`) | `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy`, set automatically by a `SaveChanges` interceptor |
| `ISoftDelete` | `IsDeleted`, `DeletedAt` + a global query filter (business records are never hard-deleted) |
| `ICityScoped` | `CityId` + a global query filter for city admins |
| `ValueObject` (or `record`) | Equality by value: `Money` (toman, long, never float), `PhoneNumber`, `Address`, `GeoPoint` |
| `ModuleDbContext : DbContext` | Applies the schema, conventions, interceptors, outbox table and query filters for each module |
| `ApiControllerBase` | See §3.1 |
| Test bases | `DomainTestBase`, `IntegrationTestBase` (Testcontainers PostgreSQL + Respawn reset), `ApiTestBase` (WebApplicationFactory) |

**EF Core inheritance mapping for vendor types** (restaurant now, supermarket and pharmacy later): `Vendor` (abstract) → `Restaurant`, later `Supermarket`, `Pharmacy`. Three options:

| Strategy | How | Pros | Cons |
|---|---|---|---|
| **TPH** (table per hierarchy) **recommended** | One `vendors` table + `VendorType` discriminator | Fastest queries, simplest migrations, EF Core default | Nullable columns for type-specific fields |
| TPT (table per type) | Base table + one table per type | Clean, normalised schema | Joins on every query, slower |
| TPC (table per concrete type) | One full table per concrete type | No joins for single-type queries | Queries across all vendors need UNION; IDs must be unique across tables |

Recommendation: **TPH**. Type-specific details (e.g. a pharmacy's licence data) go into owned or JSON columns (EF Core 10 supports PostgreSQL `jsonb` mapping). The final choice is yours. Prefer **composition over inheritance** for users: one `User` with roles and separate profiles (`CustomerProfile`, `CourierProfile`, `VendorStaff`) rather than a `User` hierarchy, because one person can hold several roles.

**PostgreSQL / EF Core rules:**
- **Concurrency:** use PostgreSQL's `xmin` as a concurrency token on aggregates (orders, payments, wallet). This prevents double confirmation and lost updates when two admins or a courier and the restaurant act at the same time.
- **Money:** `bigint` toman values wrapped in a `Money` value object. Never `float` or `double`.
- **Timestamps:** stored as `timestamptz` in UTC and shown in Jalali / Asia-Tehran only on the client.
- **Migrations:** one migration set per module (`dotnet ef migrations add ... --context OrderingDbContext`). Generate idempotent SQL scripts for production and review them before applying. Never run `EnsureCreated` in production.
- **Queries:**
  - Use `AsNoTracking` for reads.
  - Use projections (`Select`) instead of loading whole graphs.
  - Paginate every list endpoint, preferring keyset pagination.
  - Index foreign keys, `CityId`, order status and date columns.
- **Outbox:** each module has an `outbox_messages` table written in the same transaction, and a background worker publishes the messages.
- **Database roles:** the app connects with a least-privilege role (no superuser, no DDL at runtime). A separate migration role is used only during deployment.

### 3.5 Security (backend, frontend, operations)

Baseline standards: **OWASP Top 10**, **OWASP API Security Top 10**, **OWASP ASVS Level 2** for the backend and admin panel, **OWASP MASVS** for the Flutter apps.

**SQL injection and data access**
- Only use **EF Core LINQ** or parameterised SQL.
- Raw SQL only via `FromSql` / `FromSqlInterpolated` / `ExecuteSqlInterpolated`, which turn interpolated values into parameters.
- **Never** use `FromSqlRaw` / `ExecuteSqlRaw` with string concatenation or user input.
- Dynamic sort and filter fields are mapped through a **whitelist** (enum → expression), never column names taken from the request.
- The least-privilege DB role limits the damage if anything slips through.
- **Tests:**
  - A security test suite sends injection payloads (`' OR 1=1--`, `; DROP TABLE`) to every search and filter field and asserts the request is rejected or handled safely.
  - A static rule (Roslyn analyzer / CodeQL) blocks `FromSqlRaw` with non-constant input.

**Authentication**
- **OTP:**
  - 5–6 digits, expires in 2 minutes, at most 5 attempts per code.
  - Stored only as a hash.
  - **Rate limits** per phone number, per IP and per device. This stops brute force and **SMS-pumping fraud**, where attackers trigger SMS to premium numbers at your cost.
  - Add a cooldown between resends, and a CAPTCHA-free challenge (proof-of-work or device check) after repeated failures.
- **Tokens:**
  - Short-lived **JWT access tokens** (10–15 min), signed with an asymmetric key (RS256/ES256), with issuer, audience and lifetime validated.
  - **Rotating refresh tokens** stored hashed, with reuse detection that revokes the whole token family, and revocation on logout or phone change.
- **Admin panel:**
  - **Mandatory 2FA** (TOTP).
  - Short sessions and an IP allow-list option for the super admin.
  - Every sensitive action is written to the **audit log** (payment confirmations, refunds, cancellations, price or commission changes).

**Authorization (the most common API flaw)**
- **Object-level checks on every request:**
  - A customer can only read their own orders and addresses.
  - A restaurant only its own orders and menu.
  - A courier only orders assigned to them.
  - A city admin only their own city.
  - These checks prevent **IDOR / BOLA**: changing an ID in the URL must never expose someone else's data.
- **Mechanics:**
  - Policy-based authorization with a MediatR authorization behaviour.
  - Default-deny: every endpoint requires auth unless marked otherwise.
  - Use non-guessable IDs in public URLs (UUIDv7).
- **Tests:** one or more tests per endpoint that call it as the wrong user, role or city and expect `403`/`404`.

**Input, mass assignment and business logic**
- **Validation and binding:**
  - Every command has a FluentValidation validator for lengths, ranges, formats and enums.
  - Request DTOs contain only the fields a client may set. Never bind to entities, so no mass assignment (e.g. setting `Status`, `Price` or `CityId` from the client).
- **Prices and payments:**
  - **The server calculates every price, fee, discount and total.** Client-sent totals are ignored.
  - Discount codes: per-user and global usage limits, an expiry date, minimum basket, atomic redemption (no race-condition double use).
  - Gateway payments: each order has one payment record; verification is idempotent and concurrency-safe (`xmin`).
  - An order that is never paid is auto-cancelled by the server after a time limit (the exact limit is still to be decided).
  - **Idempotency keys** on place-order and payment endpoints, so a double tap or retry never creates two orders or two charges.
  - Gateway callbacks must be verified server-to-server with the gateway's verify API, and the amount and order ID checked, never trusted from the redirect.

**Transport and API hardening**
- HTTPS only with TLS 1.2+ and HSTS.
- **Rate limiting** (ASP.NET Core rate limiter) per user and IP on auth, search, order and payment endpoints.
- Strict **CORS**: only the admin panel and landing site origins, no `*` with credentials.
- Security headers on web responses: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`.
- Request size limits.
- Production errors return ProblemDetails with no stack traces, SQL or internal details.
- API versioning.
- OpenAPI/Swagger disabled or protected in production.

**File uploads** (menu photos, documents, health permits, courier IDs)
- Allow-list of types, checked by **content (magic bytes)**, not file extension.
- Size limits.
- Images are re-encoded server-side, which also strips EXIF/GPS data.
- Random file names, stored outside the web root or in object storage.
- Identity documents in a **private** bucket, served only through short-lived signed URLs to admins.
- Malware scan where possible.

**Personal data and secrets**
- **Minimise:** store only what's needed.
- **Encrypt at rest** the national ID, documents and card number of the receiving account. Phone numbers are masked in logs and to restaurants (show the last digits only; calls via a masked relay later).
- **Secrets** live in environment variables or a secret store, never in Git or in the app.
- Rotate keys, and run secret scanning (gitleaks) in CI.
- **Logs:** structured (Serilog) with correlation IDs. Never log OTPs, tokens, full phone numbers or documents.
- **Backups:** encrypted, daily, in two Iranian locations, restore-tested monthly.

**Frontend (Flutter apps, PWA, admin panel)**
- **Tokens:** stored in **`flutter_secure_storage`** (Android Keystore), never in SharedPreferences. On the web/PWA and admin panel, prefer **HttpOnly, Secure, SameSite cookies** with CSRF protection over `localStorage`.
- **No secrets in the app.** API keys for maps or push are restricted by package name or signature on the provider side, and anything privileged goes through the backend.
- **Release builds:**
  - `--obfuscate --split-debug-info`, R8/ProGuard, no debug logs.
  - `android:allowBackup="false"` and `usesCleartextTraffic="false"`.
- **Certificate/public-key pinning** for the API domain, with a backup pin.
- Root/emulator detection as a risk signal for the courier app, without blocking.
- Input validation on the client is for UX only; the server re-validates everything.
- **Deep links** (e.g. order tracking) are validated and never perform actions without auth.
- **Admin panel (web):**
  - Framework auto-escaping, no `innerHTML` with user content (XSS).
  - A strict CSP, `frame-ancestors 'none'` (clickjacking), and session timeout.
- **Payment screen:** shows only the card number from the server, and copy-to-clipboard is cleared after use. Screenshot protection is optional.
- **Dependencies:** pin versions, review package popularity and maintainers, and run `flutter pub outdated` and audits.

**DevSecOps and penetration testing**
- **CI on every PR:**
  - Tests, including the security test suite.
  - SAST (CodeQL or SonarQube), dependency scanning (`dotnet list package --vulnerable`, Dependabot), secret scanning.
- **DAST:** an **OWASP ZAP** baseline scan against staging on each release.
- **Mobile:** **MobSF** static and dynamic analysis of the release APK.
- **Penetration test before public launch.** Test it yourself against OWASP WSTG, MASTG and the API Top 10, then have an **external pentester** do a black/grey-box test, focused on:
  - OTP and session handling
  - IDOR across customers, restaurants, couriers and cities
  - Payment, discount and wallet logic (race conditions, replay, price tampering)
  - Admin privilege escalation
  - File uploads
  - SQL injection and XSS
  - Rate limits and SMS abuse
- Fix every critical and high finding before launch and re-test.
- Then retest after every major change, plus at least once a year.
- **Infrastructure:**
  - Patch the server OS.
  - Firewall: only 80/443 public; SSH by key with a non-default port or VPN; the database is not reachable from the internet.
  - fail2ban, monitoring and alerts.
  - A WAF / DDoS protection layer (e.g. ArvanCloud CDN and WAF).
- **Incident response:** a short written plan covering who to call, how to revoke tokens and rotate keys, and how to inform users.

### 3.6 Product inventory

| Product | Android | iPhone | Desktop |
|---|---|---|---|
| Customer app | Native | PWA | – |
| Courier app | Native (full, background GPS) | Limited PWA: no live tracking, manual status updates; or require couriers to use Android | – |
| Restaurant app | Native (phone + tablet) | PWA | – |
| Landing site | Simple standalone site: product intro, APK download link, Bazaar/Myket links, iPhone PWA install guide | | |
| Admin panel | Web, for the super admin and city admins: approve restaurants, manage couriers, view orders, commission, support, confirm payments | | |
| Backend + API | Iranian server | | |

**Total: 3 Flutter apps (shared package) + 2 websites (landing + admin) + 1 backend.**
Amir explicitly rejected a web-based restaurant panel, because users expect an installed app.

**Courier on iPhone:** this is a known weakness. iOS PWAs can't track GPS in the background, and their notifications are unreliable. The recommendation for the MVP is to require Android for couriers, or to lend or sell them a cheap Android phone.

## 4. Design System (updated Nov 12, 2026: new reference style)

Started from the doc "سیستم طراحی شهرضافود". On Nov 12 the **colors and style were replaced** with those of a new reference mockup: a fried-chicken app home screen with warm orange-red accents on a cream background. Typography, spacing, RTL rules and the order-flow screens stay as before. Give this section to the AI at the start of every design or coding prompt. After any important design change, **update this section first**, then continue.

### 4.1 Principles
- **Warm, appetizing, food-first.** Orange-red drives action, cream gives warmth, deep red is used only in the hero banner.
- **Clear sections.** The home screen is a stack of sections, each with one job: header, search, hero banner, categories, item rows, promo banner.
- **Photo-led.** Large, cut-out food photos on soft backgrounds are the main visual element.
- **Soft and rounded.** Large radii, soft shadows, no sharp borders. Icons are outline style with rounded corners.
- **Restraint.** One primary action color. Badges and stars are small accents, never large areas. Orange-red covers at most about 15% of a screen, outside the hero banner.
- **Fast.** Animations are short (max 250 ms), and placing an order never lags.
- **Consistent across the 3 apps.** One shared token and component package.
- **Inspiration, not imitation.** Take the layout and color mood only. **Don't copy fast-food brand trade dress** such as striped buckets or a brand's packaging look. Use real photos from the partner restaurants.

### 4.2 Colors
The codes were estimated from the reference image and can be refined after the first build on a phone.

| Role | Token | Code | Usage |
|---|---|---|---|
| Primary orange-red | `primary` | `#E4501E` | Primary buttons ("سفارش بده"), round "+" add buttons, active tab, center tab button, "مشاهده همه" links |
| Pressed | `primaryPressed` | `#C2410C` | Pressed state |
| Peach | `primarySoft` | `#FCE3D0` | Selected category circle, promo banner background, secondary button |
| Hero deep red | `heroDeep` | `#8B2313` | Hero banner background (may blend toward `primary` at the photo side) |
| Background | `background` | `#FBF0E6` | Cream background of every screen |
| Surface | `surface` | `#FFFFFF` | Cards, search bar, icon buttons, bottom bar |
| Ink | `ink` | `#1F1A17` | Headings, item names, prices |
| Secondary text | `inkMuted` | `#73675F` | Subtitles, rating counts, placeholders |
| Divider | `line` | `#F0DFD0` | Soft dividers, input borders |
| Badge red | `badgeRed` | `#C8281E` | "پرفروش" and "٪ تخفیف" badges, round discount sticker |
| Badge amber / star | `accentAmber` | `#F5B32F` | "محبوب" badge, rating stars |
| Success | `success` | `#16A34A` | Payment confirmed, delivered |
| Error | `danger` | `#DC2626` | Input errors, order cancelled |

- Text on `primary`, `heroDeep` and `badgeRed` is white at weight 700. Text on `accentAmber` is `ink`.
- **No dark mode in v1.**  ⚠️ **[سابقاً منسوخ شد — تم تیره و روشن با کلید در تنظیمات اضافه شد (v47)]**
- The earlier palette (orange `#F97316` + navy `#1B1F2A`) and the lapis/saffron proposal are **retired**.

### 4.3 Typography
The only font is **Yekan Bakh** (font files supplied by the founder; **confirm the license for embedding in the apps before release**). The font files are bundled inside the apps and the site and are never loaded from a CDN or Google Fonts. Digits in the UI are **Persian** (۱۲۳).

| Level | Size (sp) | Weight | Line height | Usage |
|---|---|---|---|---|
| Large title | 24 | 800 | 1.4 | Screen title, banner headline |
| Title | 20 | 700 | 1.4 | Section titles, restaurant name on the restaurant page |
| Subtitle | 16 | 700 | 1.5 | Restaurant name on cards, card titles |
| Body | 14 | 400 | 1.7 | Descriptions and general text |
| Small | 12 | 400 | 1.6 | Times, labels, minor notes |
| Button | 15 | 700 | 1.2 | Button text |
| Price | 15 | 800 | 1.2 | Prices and wallet balance |

- The minimum text size is 12, and body text is never smaller than 14.
- Persian line height is larger than Latin so dots and diacritics don't get clipped.
- Text is always right-aligned, except numbers or Latin names.

### 4.4 Shape, spacing, shadow
All spacing is a multiple of 4 px, and only four corner radii are used.

| Token | Value (px) | Usage |
|---|---|---|
| `radiusSm` | 12 | Chips, tags, small inputs |
| `radiusMd` | 20 | Inputs, small cards, food photos in lists |
| `radiusLg` | 28 | Restaurant card, banner, wallet card, bottom sheets |
| `radiusFull` | 999 | Buttons (pill), active tab, avatar |
| `space` | 4 · 8 · 12 · 16 · 20 · 24 · 32 | Spacing and padding |
| Screen margin | 16 | Left/right screen edge padding |
| Card shadow | y=4, blur=16, `ink` at 6% opacity | Cards on the cream background |
| Floating shadow | y=8, blur=24, `primary` at 25% opacity | Floating primary button and bottom bar |

- Cards have **no border**; a soft shadow separates them from the background. Only inputs get a `line` border.
- The minimum touch target is **48×48**. The courier app uses **56**, because couriers wear gloves and work on a motorbike.
- Animations last 150–250 ms with `easeOut`. No long decorative animations.

### 4.5 Components (from the reference, adapted to a multi-restaurant app)
| Component | Spec |
|---|---|
| Top header | Rounded-square icon button for the menu, a greeting line (small) plus a bold two-line headline, and rounded-square icon buttons for notifications and cart, each with a small `primary` count badge. **Added for a marketplace:** a city/address selector line ("ارسال به: …") |
| Search bar | White pill, height 52, magnifier icon, `inkMuted` placeholder, with a separate white rounded-square **filter** button beside it |
| Hero banner (carousel) | `radiusLg`, `heroDeep` background. Small pill tag, large bold white headline, one-line subtitle, `primary` pill CTA with a white arrow circle, large cut-out food photo on the opposite side, page dots below. Used for paid placements and campaigns (ads) |
| Category circle | 72 px circle with a food photo inside and a label below. The selected one has a `primarySoft` filled circle. Scrolls horizontally |
| Section header | Bold title, plus a "مشاهده همه" link with an arrow in `primary` on the opposite side |
| Item / restaurant card | White, `radiusMd`, soft shadow, horizontal scroll. Photo on top, a badge pill in the top corner (`badgeRed` or `accentAmber`), a heart icon in the other corner, bold name, muted subtitle, star rating + count, bold price, and a round `primary` "+" button. **Restaurant variant:** delivery time and delivery fee instead of price, no "+" |
| Promo banner | `primarySoft` background, `radiusLg`. Small red label, bold headline, subtitle, outline pill CTA, food photo, round `badgeRed` discount sticker ("۳۰٪ تخفیف") |
| Bottom bar | Floating white bar with large radius and soft shadow. **5 items**, with a raised round `primary` button in the center. Active item: `primary` icon and label |
| Primary button | Pill, `primary`, white text at weight 700, height 52, with an arrow circle when it leads onward |
| Order status | Step bar with `primary` dots: placed, restaurant confirmed, preparing, on the way, delivered |
| Error / empty state | Simple illustration, one clear Persian sentence, one button. No technical errors are ever shown |

**Customer app bottom bar (RTL, right to left):** خانه (Home) · رستوران‌ها (Restaurants) · **سفارش‌ها (Orders, raised center button)** · تخفیف‌ها (Offers) · حساب (Profile).  ⚠️ **[سابقاً منسوخ شد — نوار پایین نهایی: خانه·رستوران‌ها·سبد (مرکز)·پیشنهادها·حساب]**
This replaces the earlier 4-tab bar. The cart moves to the header icon.

### 4.6 Differences between the apps
- **Customer:** photo-led, airy, one primary button per screen.
- **Courier:** larger text and buttons (56 touch target), minimal information, full-width buttons for the steps "Arrived", "Picked up" and "Delivered". Readability in sunlight matters more than elegance.
- **Restaurant:** the order list comes first. A new order arrives with a sound and a highlighted orange card, with large "Accept" and "Reject" buttons. Tablet-friendly, with a two-column layout.

### 4.7 Persian & RTL rules
Most AI tools build left-to-right by default, so repeat these rules in every prompt.
- The whole app and site are **RTL**: `Directionality(textDirection: TextDirection.rtl)` in Flutter, `dir="rtl" lang="fa"` on the web.
- Directional icons are mirrored: the back button sits at the top right with the arrow pointing right.
- The bottom bar runs right to left, so Home is the right-most tab.
- Use **Persian digits** in text and prices. Prices get thousand separators and the unit "تومان", e.g. `۹۵,۰۰۰ تومان`. Pick one currency unit for the whole app and keep it.
- Dates are **Jalali (Shamsi)** with Persian month names.
- Protect Latin names or numbers inside Persian text with a separate `Directionality` or direction marks (LRM) so they don't jump around.
- All UI copy is Persian only, with no extra dashes. The tone is friendly and short, e.g. «سفارشت ثبت شد» ("your order is placed") rather than long formal sentences.
- Always review sample text in AI-generated designs; models sometimes swap or drop Persian letters.

### 4.8 Flutter tokens
Put this in the shared package (`dokoon_ui`) so all three apps use it. Declare the font as a local asset in `pubspec.yaml`.

```dart
import 'package:flutter/material.dart';

class SfColors {
  static const primary = Color(0xFFE4501E);
  static const primaryPressed = Color(0xFFC2410C);
  static const primarySoft = Color(0xFFFCE3D0);
  static const heroDeep = Color(0xFF8B2313);
  static const background = Color(0xFFFBF0E6);
  static const surface = Color(0xFFFFFFFF);
  static const ink = Color(0xFF1F1A17);
  static const inkMuted = Color(0xFF73675F);
  static const line = Color(0xFFF0DFD0);
  static const badgeRed = Color(0xFFC8281E);
  static const accentAmber = Color(0xFFF5B32F);
  static const success = Color(0xFF16A34A);
  static const danger = Color(0xFFDC2626);
}

class SfRadius {
  static const sm = 12.0;
  static const md = 20.0;
  static const lg = 28.0;
  static const full = 999.0;
}

final sfCardShadow = [
  BoxShadow(
    color: SfColors.ink.withOpacity(0.06),
    offset: const Offset(0, 4),
    blurRadius: 16,
  ),
];

ThemeData sfTheme() {
  return ThemeData(
    useMaterial3: true,
    fontFamily: 'Yekan Bakh',
    scaffoldBackgroundColor: SfColors.background,
    colorScheme: ColorScheme.fromSeed(
      seedColor: SfColors.primary,
      primary: SfColors.primary,
      surface: SfColors.surface,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: SfColors.primary,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
      ),
    ),
  );
}
```
This is a starting point and gets fuller after the first screens and feedback (typography, more colors and components).

### 4.9 Base prompt
Paste this at the start of every design or coding request, then write which screen you want. (Translated from the Persian original.)

```text
You are the lead designer and developer of the "Dokoon" (دکون) app (v1: ordering from the
restaurants of each city).
Follow the design system below exactly and do not add any colors or fonts of your own.
Colors: primary #E4501E, primaryPressed #C2410C, primarySoft #FCE3D0, heroDeep #8B2313,
background #FBF0E6, surface #FFFFFF, ink #1F1A17, inkMuted #73675F, line #F0DFD0,
badgeRed #C8281E, accentAmber #F5B32F, success #16A34A, danger #DC2626.
Font: Yekan Bakh only, as a local file, no CDN.
Style: warm and appetizing, cream background, large cut-out food photos, big rounded
cards with soft shadows, outline rounded icons, deep-red hero banner, circular category
chips, item cards with a badge, heart, rating, price and a round orange "+" button.
Do not copy any real brand's packaging or trade dress.
Shape: corners 12/20/28, pill buttons, spacing in multiples of 4, minimum touch target 48
(56 in the courier app).
Language & direction: Persian, right-to-left (RTL), Persian digits, prices in toman with
thousand separators, Jalali dates, mirrored directional icons.
Customer bottom bar (5 items): Home, Restaurants, Orders (raised center), Offers, Profile.  ⚠️ **[سابقاً منسوخ شد — نوار پایین نهایی: خانه·رستوران‌ها·سبد (مرکز)·پیشنهادها·حساب]**
Architecture: component-driven Flutter. Build reusable widgets in the shared package
`dokoon_ui` and compose screens from them. No hard-coded colors or strings.
Process: strict TDD. Write the failing test first, then the code, and keep running the
tests until all are green. Follow SOLID, DRY and Clean Code.
No external services (Firebase, Google Fonts, CDN).
Write Persian copy short and friendly.
My request:
```

### 4.10 Notes
- **Logo:** four B&W concepts exist (see §12). The favourite is the Persian bazaar arch with a steaming cloche, still to be vectorised and paired with a Yekan Bakh «دکون» wordmark.
- The reference mockup's fast-food look (striped buckets and similar) must not be copied; it resembles a real brand.
- The landing-site background should be a local landmark of each city or a plain, unnamed design.
- The brand name and logo must be **configurable values**, not hard-coded.

## 5. Order lifecycle and build order

Five products and about 75 screens, from sign-in to delivery. Screens marked **MVP = Yes** are needed in v1; the rest come later.

### 5.1 Order lifecycle (8 states)
Each order passes through 8 states, and in each state exactly one role is responsible. This table is the basis for the DB and the notifications. The times are suggestions and will be adjusted after testing in Shahreza.

| # | State | Owner | What happens | If something goes wrong |
|---|---|---|---|---|
| 1 | Placed & paid | Customer | The order is placed and paid; the restaurant is notified | Payment fails → no order is created |
| 2 | Awaiting confirmation | Restaurant | Accepts or rejects, with an estimated prep time | Rejected or no answer after **3 min** → auto-cancel and refund |
| 3 | Preparing | Restaurant | The food is cooked | Delay → the restaurant extends the time and the customer is informed |
| 4 | Ready for pickup | Restaurant | Nearby couriers are notified | No courier after **5 min** → alert to the admin |
| 5 | Courier accepted | Courier | The courier heads to the restaurant | Courier withdraws → the order goes to another courier |
| 6 | Picked up | Courier | The courier collects the order | Mismatch → report to the admin |
| 7 | On the way | Courier | The customer sees the route or the steps | Customer unreachable → call and report |
| 8 | Delivered | Courier | The customer rates; the order is closed | Complaint → support and admin |

- The admin can cancel, refund or reassign the order to another courier **in any state**.
- Until the gateway payment is verified on the server, **the order does not reach the restaurant**.
- If the restaurant has its own courier, the restaurant records steps 5–8 in the restaurant app; otherwise our courier does.

### 5.2 Screens
The full, updated list of screens (123, of which 103 are in the MVP) for the customer, restaurant and courier apps, the admin panel and the landing site, with per-screen security notes, is in the separate file **`dokoon-screen-map.md`**. It supersedes the earlier screen tables from the "نقشه صفحات شهرضافود" doc.

### 5.7 Build order (two people: one frontend, one backend; TDD on both sides)
1. API contract and DB structure (both): every request between the apps and the server, with a city field in the tables.
2. Prototypes of key customer screens (home, restaurant page, cart, order tracking), reviewed and approved before coding.
3. OTP sign-in and registration for all three roles (apps + backend).
4. The core order cycle: restaurant and menu, cart, placing the order, online payment through the gateway, restaurant acceptance.
5. Courier app and order assignment.
6. A minimal admin panel.
7. Notifications and payment hardening. The gateway needs eNamad and documents; start the application **now**, because it takes time.
8. Landing site and a limited test with a few restaurants and couriers.

### 5.8 Answered questions (as recorded in the doc)
- **Payment:** online gateway only (decided). Couriers never take cash. The payment module is pluggable so the gateway provider can change.
- **Delivery fee:** restaurants with their own couriers set it themselves; for Dokoon couriers it's **45,000–60,000 toman** depending on distance (confirmed). The customer pays it, and it's not fixed.
- **Couriers:** each restaurant's own couriers are paid per that restaurant's arrangement; Dokoon's hired couriers get a variable amount per order (decided).
- **Wallet & discount codes:** in v1 (decided).
- **iPhone customer app:** PWA (confirmed).
- **How Shahreza restaurants take orders today:** phone, messaging apps and SnapFood, so our app is one of several channels and must show new orders with a sound alert and no friction.
- **Restaurants' own couriers:** the restaurant records order status ("on the way", "delivered") in the restaurant app; those couriers don't need our courier app (decided; simpler, and no need to register and approve restaurant couriers).

## 6. Business decisions (answers to the open questions)

| Topic | Decision |
|---|---|
| Payment v1 | Online payment gateway **and cash on delivery** (per-restaurant `allowCash`). **The courier collects cash from the customer**, records the amount, and the cash is settled later (design of courier cash settlement is pending in the courier app) |
| Payment method | **Online payment gateway** (e.g. ZarinPal), which needs eNamad. The payment module must stay pluggable |
| Who confirms transfers | **The founder himself**, during working hours |
| Order flow gate | The restaurant **does not receive the order** until the admin confirms the payment |
| Courier type per restaurant | Each restaurant is flagged as **"own courier"** or **"Dokoon courier"**. It is set in the restaurant app and controllable from admin |
| Delivery fee | Own-courier restaurants set their own fee. For our couriers the **customer pays 45,000–60,000 toman** depending on distance (indicative, not fixed). Courier pay differs between the two types |
| Restaurant-own couriers | Don't use our courier app. The **restaurant updates the status** ("on the way", "delivered") in the restaurant app |
| Wallet & discount codes | Amir wanted both in v1. Claude advised **postponing the wallet** until the gateway exists, because holding customer money in a personal account is risky. The final decision was left to Amir. Discount codes stay in v1 |
| iPhone customer app | PWA (confirmed) |
| Commission | Lower than competitors. Model suggestion: a low flat commission, a delivery fee separate from food, and restaurants may use their own courier. Calculate per-order costs first: gateway fee, SMS, courier, server, support, marketing |

### Payment note (decided)
- Payment is **online gateway only**. The gateway needs eNamad; see the application item below.
- **Apply for eNamad and a gateway this week**, in parallel with the build. The founder had not applied yet.

## 7. Licenses & legal (to verify with a lawyer / the relevant union)

- Company registration or a suitable business license, plus an economic code
- **eNamad** (Ministry of Industry, Mine and Trade), practically required for a payment gateway
- Samandehi registration for the site, if required
- Membership in the relevant guild; internet-business and courier/transport platform rules
- Restaurant contracts that define responsibility for hygiene and food quality; restaurants need valid health permits
- Courier contracts and insurance: accident insurance, motorbike license, plate and vehicle insurance
- Privacy policy and terms of use
- App distribution: Google Play, Cafe Bazaar, Myket and a signed APK
- Payment documents for the gateway and a suitable bank account

## 8. Multi-city expansion, delivery providers and ads

- **Plan:** Shahreza first, then **Nain, Jam** and other small towns. Later the app becomes a super-app (supermarket, pharmacy…), but **v1 is restaurants only**.
- **Build for many cities, launch in one.** Design multi-city from day one but launch only in Shahreza.
  - One codebase, one backend, one database. `city` is a DB record, and every vendor, courier and order belongs to a city. Never copy the project per city.
- **Configurable per city:** map center, delivery zones, commission %, delivery-fee rules, working hours, active areas, support phone.
  - Each city gets a **city admin** (scoped to that city) under a **super admin**.
- **Branding:** decided. **One umbrella brand, "Dokoon",** with city selection inside the app.
- **Expansion is mostly operational:**
  - Each city needs a **local representative** (the city admin) to recruit restaurants, sign up delivery partners and handle support.
- **Delivery providers (pluggable, see the Delivery module in §3.1):**
  - Our couriers
  - The restaurant's own courier
  - **Local taxi agencies** (آژانس), under a monthly-settled contract. The driver gets a per-order SMS link with "picked up" and "delivered" buttons, so no app install is needed.
  - **Snapp / SnappBox.** It has a bulk-delivery service for businesses. Whether it covers Nain and Jam, and whether it has a public API, is **not verified**.
  - The fee formula must be set per provider.
- **Ad space:** a revenue line that lets the commission stay low.
  - Paid "featured" restaurant placements, labelled «ویژه»
  - Hero and promo banners, per city and per date range
  - Ads from local non-restaurant businesses
  - Rules: always labelled as ads, and no pop-ups or full-screen ads.

## 9. Roadmap

- **Phase 0 – Validation (2–4 weeks):** talk to 10–20 local restaurants (problems with SnapFood: commission, support) and map the available couriers and their phones.
- **Phase 1 – AI design (1–2 weeks):** design system ✅, screen map ✅, interactive prototypes of key screens (in progress).
- **Phase 2 – MVP (6–10 weeks):** one full simple cycle: the customer orders → the restaurant accepts → the courier picks up → the customer receives. Defer coupons, ratings, chat and analytics (discount codes were moved into v1 by the founder's choice).
- **Phase 3 – Limited test (4 weeks):** 3–5 restaurants and 3–5 couriers in one neighborhood.
- **Phase 4 – Landing site & release.**
- Local setup before coding: Flutter SDK, Android Studio, Git, a real Android test phone.
- The founder deploys to the server, tests on devices and publishes to the stores; Claude can't do these.

## 10. Next step

1. **API contract + module map** (both developers), based on §3.1, with a `CityId` on all main aggregates.
2. **Frontend:** build the `dokoon_ui` tokens and components with TDD, test first (widget and golden tests), following §4.5.
3. **Prototype the key customer screens** in the new style: home (as in the reference, adapted to a multi-restaurant app), restaurant page, cart, payment (gateway redirect and result), order tracking.
4. **Backend:** the Identity, Cities, Vendors and Ordering modules first, with TDD (domain tests first).
5. Then the payments, delivery and admin modules, and the landing site.

## 11. Still open

- The final call on whether the wallet is in v1 (the doc says yes; Claude advised waiting for the gateway).
- Whether Pushe/Najva and Neshan/Balad have working Flutter SDKs.
- The exact commission % (to be calculated from per-order costs).
- Gateway / eNamad application status.
- Domain and trademark check for **Dokoon** (`dokoon.ir`, `dokkoon.ir`) at nic.ir and with the Industrial Property Office.
- Logo for Dokoon.
- Flutter state-management library.
- Mapping library: AutoMapper (Community licence) or Mapperly.
- Register for the MediatR/AutoMapper Community licence keys.
- Book an external penetration tester before the public launch.
- Snapp/SnappBox coverage and API in Nain and Jam; taxi-agency contracts per city.

## 12. Session log (Nov 12, 2026)

- **Name:** after many rounds of name ideas, the name **دکون (Dokoon)** was chosen.
  - Rounds covered: food names, super-app names, names that make rhyming slogans, mythology, Snapp/Tapsi-style coinages.
  - Rejected finalists: جینگ، سفره، خوانچه، ویژ، بقچه، زنبیل.
  - Claude had recommended خوانچه; the user chose دکون.
- **Colours:** Claude proposed lapis + saffron. The user then supplied a fast-food app mockup and chose its **warm orange-red on cream** style for v1. The palette is in §4.
- **Logo:** four B&W concepts were generated in ChatGPT (via the user's Chrome):
  1. A shop awning with a bowl
  2. A "d" made of a plate and fork
  3. A smiling takeaway bag with an awning top
  4. **A Persian bazaar arch with a steaming cloche** (Claude's pick)

  The concepts are PNG only. Next: vectorise the chosen one and pair it with a Persian Yekan Bakh wordmark.
- **Super-app plan:** supermarkets and pharmacies later. Pharmacies start with non-prescription products after a legal check. The data model is already generic (Vendor + type, Catalog).
- **Delivery providers and ads:** see §8.
- **Screen map:** a doc of all menus and screens was created («نقشه کامل منوها و صفحات دکون», a Claude Doc). The English version is in `dokoon-screen-map.md`. Open question in that doc: should the raised centre button of the customer bottom bar be **Orders** or **Cart**?
- **Backend stack:** decided as **.NET 10 + CQRS + MediatR + thin controllers + EF Core 10 + PostgreSQL**, with base-class inheritance (§3.1, §3.4).
- **Security:** requirements were added for both sides (§3.5).


## 13. Design decisions log (customer app prototype)
- **Payment:** online gateway only. Checkout shows "online payment"; the app redirects to the gateway and returns to a result screen (success or failure).
- **Font:** Yekan Bakh is the app font (weights: 400 body, 500 labels, 700 buttons and titles, 800 prices and headlines). Self-host the files in `dokoon_ui`; confirm the license first.
- **Home header:** hamburger menu on the right, a wide semi-transparent delivery-address chip in the middle, the logo on the left. No cart or notification icons in the header; notifications live under Account.
- **Bottom bar:** Home · Restaurants · **Cart (raised centre button with a cart icon and item count)** · Offers · Account. Orders live in the account menu and the hamburger menu.
- **Addresses:** the address sheet lists saved addresses, then a dashed empty "Add new address" button, plus a "+" button next to the close button. A new address can be entered manually, picked on a map, or taken from the device's current location.
- **Dish options:** each restaurant decides whether customers can add extras (sauce, bread, extra rice...). The restaurant app defines option groups per dish; dishes without groups are fixed portions.

---
## گزارش یکپارچه‌ی تغییرات اپ مشتری (نسخه‌ی ۴۸) — اضافه / حذف / تغییر

### تصمیم‌های پلتفرم (جدید)
- فاز ۱: فقط اندروید؛ اپ مخصوص آیفون نداریم. کاربران آیفون (مشتری، رستوران‌دار، پیک) از PWA استفاده می‌کنند. به پیک‌ها هنگام استخدام «ترجیحاً اندروید» گفته می‌شود. محدودیت‌های شناخته‌شده‌ی iOS PWA: لوکیشن پس‌زمینه ندارد (ردیابی پیک)، اعلان فقط iOS ≥16.4 پس از نصب روی صفحه‌ی اصلی، هشدار بلند/مداوم سفارش جدید برای رستوران قابل اتکا نیست.
- توصیه‌ی فرانت (در انتظار تأیید مالک): وب‌اپ PWA + پوشش اندروید (Capacitor/TWA)، به‌جای Flutter.

### اضافه‌شده
- پرداخت نقدی هنگام تحویل (`allowCash` هر رستوران، پیش‌فرض روشن) کنار پرداخت آنلاین.
- تم روشن/تیره با کلید در تنظیمات؛ توکن‌ها به متغیرهای CSS.
- صفحات خطا (`error`): offline, 500, 503, 504, 403, 404, 401 + شنونده‌ی واقعی قطع اینترنت.
- پیام موفقیت ثبت‌نام رستوران/پیک.
- نمایش زمان تحویل بر پایه‌ی `etaMin/etaMax` رستوران.
- حدود ۲۶ صفحه‌ی جدید: splash, onboard, city, login, otp, setup, perms, search, restaurants, offers, campaign, favs, notifs, editprof, settings, promos, support, invite, about, legal, apply, rateapp, restinfo, cancel, report, rateorder, social, error.
- کامپوننت‌ها: SocialCard, ListRow, ToggleRow, FaqItem, CouponCard, StarPicker, ErrorPage (جمعاً ۴۰ کامپوننت).
- منوی همبرگری و حساب بدون آیتم تکراری؛ «درباره‌ی ما و قوانین» یک دکمه.
- نظرات برای همه‌ی غذاها؛ گیرنده (خود/دیگری با نام و موبایل)؛ حذف آدرس.

### حذف‌شده / منسوخ
- انتخاب زمان تحویل (زمان‌بندی) و عبارت «هرچه زودتر»؛ `allowScheduled` خاموش و منسوخ.
- پرداخت «فقط آنلاین» و «کارت‌به‌کارت»؛ «بدون تم تیره».
- یادداشت برای هر غذا (فقط یادداشت سبد).
- صفحات طراحی اولیه‌ی Main, Menu, Filter, Restaurant, Restaurant2, Dish (نسخه‌ی ۴۸؛ بایگانی در `archive/legacy-boards`).

### تعارض با اسناد/اپ‌های دیگر (باید اصلاح شود)
1. **تصمیم قطعی:** پیک وجه نقد را از مشتری دریافت می‌کند. در اپ پیک (هنگام ساخت) باید تأیید دریافت مبلغ، ثبت `cash_collected` و تسویه‌ی نقدی اضافه شود؛ متن قدیمی «بدون دریافت وجه» منسوخ است.
2. اپ رستوران/ادمین: کلید `allowCash`، تسویه‌ی نقدی؛ حذف سوییچ `allowScheduled`؛ فیلد زمان تحویل (`etaMin/etaMax` و ۱۰/۲۰/۳۰/دلخواه هنگام پذیرش).
3. ادمین: نمایش روش پرداخت و گزارش مالی نقدی.

### باز
کیف پول · نقشه‌ی زنده‌ی پیک · تست کامل در مرورگر واقعی · مجوز فونت · داده‌ی واقعی (شبکه‌ها، پشتیبانی، آدرس‌ها، متن حقوقی) · تایید پشته‌ی فرانت.

### خروجی‌های تحویل فرانت‌اند (پوشه‌ی handoff)
`dokoon-design-system.md` + `dokoon-tokens.css` + `dokoon-design-tokens.json` · `dokoon-component-library.md` · `dokoon-screen-specs.md`.
