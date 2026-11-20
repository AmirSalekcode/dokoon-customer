# Dokoon (دکون): Complete Menus and Screens Map

> English version of the Claude Doc «نقشه کامل منوها و صفحات دکون», Nov 12, 2026, with security notes per area.
> Scope: **v1 = restaurants of each city only.** The structure is generic (Vendor + type, Catalog) so supermarkets and pharmacies can be added later.
> Related file: `dokoon-context.md` (architecture, design system, TDD and security baseline).

**Totals:** 5 products, **123 screens** plus **11 shared states**. **103 screens are in the MVP**, 19 come after launch, and 1 (Wallet) is still undecided.

| Product | Screens | MVP | Later | Open |
|---|---|---|---|---|
| Customer app | 45 | 36 | 8 | 1 (Wallet) |
| Restaurant app | 26 | 22 | 4 | – |
| Courier app | 19 | 17 | 2 | – |
| Admin panel | 27 | 23 | 4 | – |
| Landing site | 6 | 5 | 1 | – |
| **Total** | **123** | **103** | **19** | **1** |

---

## 1. Navigation and menus

| Product | Bottom bar (RTL, right to left) | Header | Side / account menu |
|---|---|---|---|
| Customer app | Home · Restaurants · **Cart (raised centre button, cart icon)** · Offers · Account | Hamburger (right), address selector (centre), logo (left) | Account menu: profile, addresses, wallet, favourites, invite friends, support, settings, terms, sign out |
| Restaurant app | Orders · Menu · Reports · Account | Restaurant open/closed toggle, notifications | Account menu: restaurant profile, hours, delivery & courier, settlements, staff, ads, support, sound & printer settings |
| Courier app | Orders · Earnings · Account | Large online/offline toggle | Account menu: details, documents, leave, bank account, support, guide |
| Admin panel (web) | Side menu: Dashboard · Orders · Payments · Restaurants · Couriers · Customers · Finance · Ads & Discounts · Support · Reports · Cities · Settings | City switcher (super admin), alerts, admin account | – |
| Landing site | Top menu: Features · Install guide · Restaurants · Couriers · FAQ + Download button | – | – |

- In every app the back button is at the top right and its arrow points right.
- The customer cart sits in the header. When it has items, a floating "View cart" bar also appears above the bottom bar.
- All menus and texts are read from config, so supermarket and pharmacy categories can be added without changing the structure.
- **Open question:** should the raised centre button be **Orders** or **Cart**?  ⚠️ **[سابقاً منسوخ شد — تصمیم نهایی: سبد]**

---

## 2. Customer app (45 screens)

### 2.1 Sign-in and onboarding

| Screen | Content / main job | MVP |
|---|---|---|
| Splash | Logo, version check, sign-in check | Yes |
| Onboarding (3 slides) | First launch only, skippable | No |
| Choose city | Shahreza, Nain, Jam… with auto-detection | Yes |
| Sign in with mobile | Phone number, accept terms | Yes |
| OTP code | SMS code, resend with timer | Yes |
| Complete profile | Name, referral code (optional) | Yes |
| Location & notification permissions | Request with an explanation | Yes |

### 2.2 Discovering restaurants

| Screen | Content / main job | MVP |
|---|---|---|
| Home | Address, search & filter, hero banner (ad), category circles, featured, nearby and popular restaurants, promo banner | Yes |
| Search | Restaurants and dishes, recent and popular searches | Yes |
| Search results | Two sections: restaurants and dishes | Yes |
| Filter & sort (bottom sheet) | Open now, free delivery, discounted, rating, nearest, cheapest delivery | Yes |
| Restaurants tab | All restaurants in the city with category chips on top | Yes |
| Category list | e.g. kebab, pizza, fast food, café, pastry | Yes |
| Restaurant page | Cover, rating, delivery time and fee, minimum order, open/closed, menu tabs, search in menu | Yes |
| Restaurant info | Address on map, working hours, courier type | Yes |
| Restaurant reviews | Customer ratings and reviews | No |
| Dish details (bottom sheet) | Photo, description, size & extras, quantity, note, add to cart | Yes |
| Cart-from-another-restaurant alert | "Clear the previous cart?" | Yes |

### 2.3 Checkout and payment

| Screen | Content / main job | MVP |
|---|---|---|
| Cart | Items, quantities, note to restaurant, discount code, total | Yes |
| Choose address | Saved addresses, out-of-zone warning | Yes |
| Add address | Manual full address, pick on the map, or use current location; pin, plaque, unit, address name | Yes |
| Checkout | Address, delivery time, price summary (food, delivery, discount), payment method | Yes |
| Online payment gateway | Redirect to the gateway and back (hosted by the bank) | Yes |
| Payment result | Success or failure, go to tracking | Yes |

### 2.4 Orders

| Screen | Content / main job | MVP |
|---|---|---|
| Orders tab | Two tabs: active and past, reorder | Yes |
| Order tracking | Step bar, ETA, call courier and restaurant | Yes |
| Live courier map | Courier position on the map | No |
| Order details & invoice | Items, payment, times | Yes |
| Cancel order | Only before the restaurant confirms, choose a reason | Yes |
| Rating & review | Restaurant and courier, after delivery | No |
| Report an order problem | Missing item, wrong item, delay, quality; with photo | Yes |

### 2.5 Offers and account

| Screen | Content / main job | MVP |
|---|---|---|
| Offers tab | Discounted restaurants, my codes, campaigns | Yes |
| Campaign / banner details | Landing page for each ad banner | Yes |
| Account tab | Profile header and account menu | Yes |
| Edit profile | Name, phone, birthday (for a gift code) | Yes |
| My addresses | Add, edit, delete | Yes |
| Wallet | Balance, top-up, history | Open |
| Favourites | Saved restaurants and dishes | No |
| Invite friends | Referral code and sharing | No |
| Notifications | Notification list | No |
| Support | FAQ, contact, my tickets | Yes (contact) |
| Settings | City, notifications, delete account | Yes |
| About & terms | Privacy policy, terms of use, app version | Yes |

### 2.6 Customer app security notes
- **Sign-in & OTP:**
  - OTP rate-limited per phone, IP and device, with a resend cooldown.
  - Generic error messages that don't reveal whether a number is registered.
  - Tokens stored in `flutter_secure_storage`.
- **Change phone / delete account:** require a fresh OTP. "Delete account" also revokes all refresh tokens.
- **Cart, checkout and discount codes:**
  - Prices, fees, discounts and totals shown in the app are **display only**. The server recalculates everything on checkout and rejects tampered totals.
  - Discount codes are validated and redeemed atomically on the server.
- **Gateway payment:**
  - The amount and order ID come only from the server; the gateway result is verified server-to-server, never trusted from the redirect.
  - The place-order call sends an **idempotency key**.
- **Orders and addresses:**
  - Every order and address request is checked for ownership on the server, so changing an ID never reveals another user's data (IDOR).
  - Deep links into an order require sign-in.
- **Addresses:** stored server-side. Only the needed part is shown to the restaurant; the full address and phone only to the assigned courier during delivery.
- **Report a problem:** photo uploads are type- and size-checked and re-encoded server-side.
- **Web / PWA (iPhone):** HTTPS, HttpOnly cookies or short-lived tokens, CSP, no secrets in JS.

---

## 3. Restaurant app (26 screens)

Works on phones and tablets. Seeing and accepting new orders fast comes first.

| Section | Screen | Content / main job | MVP |
|---|---|---|---|
| Sign-in | Sign in & OTP | Mobile and code | Yes |
| Sign-in | Restaurant registration (multi-step) | Name, cuisine, address on map, photos, hours, health permit, Sheba number | Yes |
| Sign-in | Awaiting admin approval | Document review status, contact | Yes |
| Sign-in | Sound & notification test | Make sure the new-order alert is heard, even with the screen locked | Yes |
| Orders | Orders tab | New, preparing, ready, on the way, completed; open/closed toggle | Yes |
| Orders | New-order alert (full screen) | Loud sound, items, amount, 3-min timer, accept and reject | Yes |
| Orders | Accept with prep time | Choose 10, 20, 30 min or custom | Yes |
| Orders | Rejection reason | Out of ingredients, busy, closed | Yes |
| Orders | Order details | Items, customer note, add time, "Ready" button, print receipt | Yes |
| Orders | Delivery with own courier | "On the way" and "Delivered" buttons for restaurants with their own courier | Yes |
| Orders | Dokoon courier status | Courier name, arrival time, call | Yes |
| Orders | Order history | Search and date filter | Yes |
| Menu | Menu tab | Categories and items, quick available/unavailable toggle | Yes |
| Menu | Add or edit dish | Name, description, price, photo, category | Yes |
| Menu | Options & extras | Restaurant-controlled: a switch to allow extras, option groups per dish (required or optional, min/max), each option with its own price. Dishes without groups are fixed portions | Yes |
| Menu | Manage categories | Add and reorder | Yes |
| Menu | Dish discount | Percentage and time window | No |
| Reports | Reports tab | Sales today, this week, this month; order count and amount; best sellers | Yes |
| Reports | Settlement | Restaurant share, commission, payout history | Yes |
| Reports | Ratings & reviews | Customer reviews and replies | No |
| Account | Restaurant profile | Info, cover and logo, address | Yes |
| Account | Working hours | Each day, temporary closure | Yes |
| Account | Delivery & courier | Own courier or Dokoon courier, delivery fee, zone, minimum order | Yes |
| Account | Ads & featured placement | Buy a banner or a "Featured" slot | No |
| Account | Restaurant staff | Add a cashier with limited access | No |
| Account | Support & settings | Contact city admin, sound, printer, sign out | Yes |

### 3.1 Restaurant app security notes
- **Approval:** the account stays locked until an admin approves the registration documents.
- **Documents and Sheba:**
  - Health permit and Sheba number are stored encrypted.
  - Document images go to a private bucket.
  - The Sheba number can only be changed with a fresh OTP plus admin review, to stop payout hijacking.
- **Scope:**
  - Every order and menu call is scoped to the signed-in restaurant on the server.
  - A restaurant can't see another restaurant's orders or customers' full phone numbers.
- **Staff roles (later):** least privilege. A cashier can accept orders but can't change prices, Sheba or settings.
- **Prices:**
  - Server-side validation (positive amounts, sane maximums).
  - Changes are audit-logged.
  - A price change never affects orders already placed.
- **Uploads:** menu photos are content-type checked, size-limited and re-encoded.
- **Shared tablets:** the session times out after inactivity on settings and finance screens, and sensitive screens ask for the OTP again.

---

## 4. Courier app (19 screens)

Android only. Large text and buttons (56 touch target) and full-width buttons for every step. For cash-on-delivery orders the courier collects the cash from the customer and records it. Android first; iPhone couriers can use the PWA (no background location).

| Section | Screen | Content / main job | MVP |
|---|---|---|---|
| Sign-in | Sign in & OTP | Mobile and code | Yes |
| Sign-in | Registration & documents | Name, national ID, photo, licence, motorbike plate and insurance, Sheba number | Yes |
| Sign-in | Awaiting admin approval | Document review status | Yes |
| Sign-in | Device permissions | Location always, notifications, ignore battery optimisation | Yes |
| Orders | Orders tab | Online/offline toggle, active order, available orders | Yes |
| Orders | New order (full screen) | With sound: pickup, drop-off, distance, earnings; accept and reject with timer | Yes |
| Orders | Route to restaurant | Map, open Neshan or Balad, "Arrived" button | Yes |
| Orders | Pickup at restaurant | Check items, report a mismatch, "Picked up" | Yes |
| Orders | Route to customer | Map, call customer, "Arrived" | Yes |
| Orders | Hand over to customer | "Delivered"; for cash orders: confirm amount collected (cash_collected) | Yes |
| Orders | Customer unreachable | Log calls and report to admin | Yes |
| Orders | Withdraw from order | Choose a reason, reassign to another courier | Yes |
| Orders | Order history | Completed orders with earnings for each | Yes |
| Earnings | Earnings tab | Today, week, month, balance due | Yes |
| Earnings | Settlement history | Payouts from Dokoon to the courier | Yes |
| Account | Details & documents | Edit, renew insurance and licence | Yes |
| Account | Leave | Record days off | No |
| Account | Courier guide | Rules and key tips | No |
| Account | Support | Instant contact with the city admin | Yes |

The courier's location is tracked only while online or on an active order, and the app shows when tracking is on.

### 4.1 Courier app security notes
- **Location:**
  - Sent only while online or on an active order, over HTTPS.
  - Accepted only from the authenticated courier.
  - Impossible jumps or speeds are flagged (GPS spoofing).
  - Root/emulator detection is logged as a risk signal.
- **Customer data:** the customer's phone and exact address are visible only to the assigned courier and only until delivery. Afterwards the order shows a masked phone and an approximate area.
- **Order acceptance:** atomic on the server (one courier wins), with a concurrency token. The timer is enforced server-side.
- **Earnings & Sheba:** a Sheba change needs a fresh OTP plus admin review. Earnings are calculated on the server only.
- **Documents:** national ID, licence and insurance images go to a private, encrypted bucket. Admins see them through short-lived signed URLs.

---

## 5. Admin panel (27 screens)

Two roles: the **super admin** sees all cities; a **city admin** sees only their own city. Access to every screen is also checked on the server.

| Menu | Screen | Content / main job | Role | MVP |
|---|---|---|---|---|
| – | Admin sign-in | Mobile or email with code, mandatory 2FA | Both | Yes |
| Dashboard | Dashboard | Today's orders, revenue, online restaurants and couriers, alerts | Both | Yes |
| Orders | Live orders | Orders in progress, stuck ones (no reply, no courier) | Both | Yes |
| Orders | All orders | Search, status and date filters | Both | Yes |
| Orders | Order details | Status history, payment, cancel, refund, change courier | Both | Yes |
| Payments | Payment history | All payments and refunds | Both | Yes |
| Restaurants | Restaurant list | Search, status, suspend | Both | Yes |
| Restaurants | Registration requests | Review documents, approve or reject | Both | Yes |
| Restaurants | Restaurant profile | Info, menu, custom commission, courier type, stats | Both | Yes |
| Couriers | Courier list | Online ones, suspend, rating | Both | Yes |
| Couriers | Registration requests | Review documents and approve | Both | Yes |
| Couriers | Live courier map | Online couriers and active orders | Both | No |
| Customers | Customer list & profile | Orders, block, gift credit | Both | Yes |
| Finance | Restaurant settlements | Balance per restaurant, record payout | Both | Yes |
| Finance | Courier settlements | Balance per courier, record payout | Both | Yes |
| Finance | Commission & delivery fee | Default %, distance rule (45,000–60,000 toman) | Super | Yes |
| Ads & discounts | Banners | Hero and promo banners with city, date range and target link | Both | Yes |
| Ads & discounts | Featured placement | "Featured" restaurants, price and period | Both | No |
| Ads & discounts | Discount codes | Create, usage limit, expiry, usage report | Both | Yes |
| Support | Tickets & complaints | Order problems, replies, refunds | Both | Yes |
| Reports | Sales & performance | Sales, delivery time, cancellations, top performers | Both | No |
| Cities | Cities & zones | Add city, map centre, delivery zone, working hours | Super | Yes |
| Cities | Admins & permissions | Create city admins, roles | Super | Yes |
| Settings | General settings | Brand name, logo, receiving card number, legal texts, minimum app version | Super | Yes |
| Settings | Broadcast | SMS or push to a city's customers | Both | No |
| Settings | Activity log | Who did what (cancellations, refunds, payment confirmations) | Super | Yes |

### 5.1 Admin panel security notes
- **Sign-in:**
  - Mandatory **2FA (TOTP)**, short session timeout, login rate limit and lockout.
  - Optional IP allow-list for the super admin.
  - New-device sign-in alerts.
- **City scoping:** every query and command is filtered by the admin's city **on the server** (EF Core global filter plus an authorization behaviour), never only hidden in the UI.
- **High-risk actions** (confirm transfer, refund, cancel, commission or card-number change, create admin):
  - Confirmation step, written to the **activity log** with who, when, before/after and IP.
  - Changing the receiving card number or creating an admin also requires a fresh 2FA code.
  - Transfer confirmation is idempotent and concurrency-safe: two admins can't confirm one payment twice.
- **Web security:**
  - CSRF protection and HttpOnly, Secure, SameSite cookies.
  - Strict CSP and `frame-ancestors 'none'`.
  - Escaping all user-provided text (restaurant names, reviews, tickets) to prevent stored XSS.
- **Documents:** viewed through short-lived signed URLs, never public links. Downloads are logged.
- **Exports and reports:** contain masked phone numbers, are limited to the admin's city, and are logged.
- **Broadcasts:** rate-limited, with preview and confirmation, to prevent spam and abuse.

---

## 6. Landing site (6 screens)

| Screen | Content | MVP |
|---|---|---|
| Home | Header with download button, headline and app mockup, features, active cities, FAQ, footer with eNamad | Yes |
| Install guide | Direct APK download, Cafe Bazaar and Myket, installing the web version on iPhone | Yes |
| For restaurants | Benefits, lower commission, partnership request form | Yes |
| For couriers | Requirements, documents needed, courier app download link | Yes |
| Advertise on Dokoon | Ad placements and contact form | No |
| Terms & privacy | Terms of use, privacy policy, contact | Yes |

### 6.1 Landing site security notes
- Static site, HTTPS + HSTS, strict CSP, no third-party trackers or CDNs (fonts self-hosted).
- **Forms:**
  - Server-side validation, rate limit and honeypot.
  - Data goes to the backend over HTTPS, and no personal data in URLs.
- **APK download:**
  - Served over HTTPS from your own domain, with the SHA-256 checksum published on the page.
  - Always signed with the same release key, kept offline and backed up.

---

## 7. Shared screens and states (all apps)

Built once in the shared `dokoon_ui` package and reused by every app.

| Screen or state | When it shows |
|---|---|
| No internet | Connection lost, with a retry button |
| General error | Server error, with no technical details shown |
| Empty states | Empty cart, no orders yet, no results, no notifications |
| Restaurant closed | Next opening time |
| Outside delivery zone | Customer address is outside the area |
| City not active yet | "Dokoon is coming to your city soon", with a phone sign-up to be notified |
| Forced / optional update | App version below the minimum set in admin |
| Maintenance | While the server is being updated |
| Account blocked or suspended | With a way to contact support |
| Session expired | Sign in again |
| Permission denied | Explanation and a button to open phone settings |

### 7.1 Key notifications

| Recipient | Notifications |
|---|---|
| Customer | Payment confirmed, restaurant accepted or rejected, order on the way, delivered, refund, new discount code |
| Restaurant | New order (with sound), order cancelled, courier arrived, payout made |
| Courier | New order (with sound), order ready, order cancelled, payout made |
| Admin | New transfer awaiting confirmation, restaurant not responding (3 min), order with no courier (5 min), new complaint |

Notification and SMS content never contains OTP codes in push messages, full addresses, or links that act without sign-in.

---

## 8. Cross-cutting security checklist (all screens)

The full requirements are in `dokoon-context.md` §3.5. In short:

- **Server is the source of truth:**
  - Every price, total, discount, fee, status change and timer is calculated and enforced on the backend.
  - The apps only display.
- **Object-level authorization on every endpoint**, with negative tests per role. This covers customers, restaurants, couriers, city admins and the super admin.
- **SQL injection:**
  - EF Core LINQ or parameterised SQL only.
  - Never `FromSqlRaw` with user input.
  - Whitelisted sort and filter fields.
  - Injection payload tests on every search and filter input.
- **Validation and binding:**
  - FluentValidation on every command.
  - Request DTOs only, with no binding to entities (mass assignment).
- **Rate limiting:** OTP, sign-in, search, place order, payment, forms, broadcasts.
- **Idempotency keys:** place order, payment confirmation, refunds, settlements.
- **Secure storage:** `flutter_secure_storage` on mobile, HttpOnly cookies on web.
- **Release builds:**
  - Obfuscated, no debug logs.
  - Certificate pinning for the API.
  - No secrets in the app.
- **Uploads:** allow-listed types checked by content, size limits, re-encoding, private storage for documents.
- **Logging and audit:** structured logs without OTPs, tokens or full phone numbers, plus an admin activity log.
- **Testing pipeline:**
  - CI: unit, integration and security tests (TDD), SAST, dependency and secret scanning.
  - OWASP ZAP baseline scan on staging and MobSF on the APK.
  - **External penetration test before public launch**, then after major changes and at least once a year.


## Updates (customer app prototype)
- **Dish reviews:** every dish shows user reviews (average, star distribution, list). The list loads more automatically as the user scrolls. An "Add review" button opens a rating-and-text sheet. The review is tied to the dish.
- **Notes:** the per-dish "note for the restaurant" was removed. The only note is the cart-level note, shown again in the checkout order summary.
- **Scheduled delivery:** the restaurant app has a switch to enable or disable it. When enabled, the customer sees 30-minute windows until closing time today and all opening hours tomorrow.  ⚠️ **[سابقاً منسوخ شد — حذف شد؛ زمان تحویل را رستوران‌دار تعیین می‌کند]**
- **Recipient:** checkout asks "for me" or "for someone else". In both cases it needs recipient name, phone number and the full address. Each saved address also stores a recipient name and phone.
- **Addresses:** saved addresses can be deleted (with confirmation).
- **Orders tab:** reached from the hamburger menu, the account page and the payment-success screen (not from the bottom bar). Active and past tabs; active orders have a tracking button, past delivered orders a reorder button. Reordering asks for confirmation if the cart holds another restaurant.
- **Order tracking:** status header with the estimated time, a five-step bar (placed, restaurant confirmed, preparing, on the way, delivered), restaurant and courier call rows, order info, items and cost summary. A cancelled order shows the cancellation notice.
- **Account tab:** profile header (name, phone, edit) and the account menu (orders, addresses, favourites, notifications, discount codes, support, settings, about, sign out). Notifications live here.

## به‌روزرسانی: تفکیک منوی همبرگری و حساب + صفحه‌ی شبکه‌های اجتماعی
**اصل:** هیچ آیتمی در دو منو تکرار نمی‌شود. «حساب» = داده و فعالیت شخصی کاربر؛ «همبرگری» = امکانات عمومی اپ (ارتباط، رشد، همکاری).
- **حساب:** سفارش‌ها (نشان «N فعال») · علاقه‌مندی‌ها · آدرس‌های من · اعلان‌ها (نشان) · کدهای تخفیف و اعتبار · تنظیمات · «درباره ما و قوانین» (یک دکمه‌ی واحد) · خروج از حساب.
- **همبرگری** (زیر سلام {نام} عزیز و کارت شهر): دعوت از دوستان · پشتیبانی و پرسش‌های متداول · ثبت‌نام رستوران · همکاری با پیک · شبکه‌های اجتماعی · امتیاز دادن به دکون.
- **صفحه‌ی `social`:** ورود از همبرگری ← TopBar + فهرست SocialCard (داده از `D.socials`)؛ خروج: بازگشت به صفحه‌ی قبلی (Home). نام‌های کاربری فعلی نمونه‌اند و باید با حساب‌های واقعی جایگزین شوند؛ دکمه‌ی «دنبال کردن» فعلاً به صفحه‌ی «به‌زودی» می‌رود.
- **کامپوننت جدید:** SocialCard (props: title, sub, handle, d, cta, onOpen).

## به‌روزرسانی: تکمیل صفحات مشتری (نسخه‌ی ۴۴ طراحی)
**ساخته‌شده و متصل (id صفحه ← ورود ← خروج):**
- ورود: `splash` (خودکار ۱٫۸ ثانیه) ← `onboard` (فقط بار اول) ← `city` ← `login` (موبایل + قوانین) ← `otp` (تایمر، کد نمونه ۱۲۳۴) ← `setup` (نام، کد معرف اختیاری؛ شماره‌ی آشنا مستقیم به خانه) ← `perms` ← Home. ورود از «خروج از حساب» و «حذف حساب» (دیالوگ تأیید) و از ابتدا؛ منوی تنظیمات شهر هم `city` را باز می‌کند.
- جستجو `search` (اخیر/محبوب، نتیجه‌ی رستوران و غذا؛ غذا ← صفحه‌ی رستوران + برگه‌ی غذا)، تب `restaurants` (دسته‌بندی + فیلتر مشترک)، تب `offers` (کدها، رستوران‌های تخفیف‌دار، کمپین‌ها)، `campaign`.
- حساب: `favs`، `notifs` (نشان خوانده‌نشده‌ی زنده)، `editprof`، `settings` (کلیدهای اعلان، شهر، حذف حساب)، `promos`، `about` + `legal` (قوانین/حریم خصوصی)، `support` (تماس، پرسش‌های متداول، ارسال پیام).
- همبرگری: `invite`، `support`، `apply` (restaurant/courier)، `social`، `rateapp`.
- سفارش: `restinfo` (از صفحه‌ی رستوران)، `cancel` (فقط وضعیت «ثبت‌شد»)، `report` (با عکس اختیاری)، `rateorder` (رستوران و پیک)؛ همه از صفحه‌ی پیگیری سفارش.
**کامپوننت‌های جدید:** SocialCard، ListRow، ToggleRow، FaqItem، CouponCard، StarPicker.
**باز/خارج از این مرحله:** کیف پول (تصمیم باز؛ ساخته نشد)، نقشه‌ی زنده‌ی پیک، علاقه‌مندی غذاها (فعلاً فقط رستوران‌ها)، نظرات رستوران.
**داده‌ی نمونه که باید واقعی شود:** نام‌های شبکه‌ی اجتماعی، شماره‌ی پشتیبانی، آدرس رستوران‌ها، متن قوانین/حریم خصوصی (پیش‌نویس، نیاز به بازبینی حقوقی)، کد دعوت، کد معرف (الگوی DOKOON-).

## به‌روزرسانی (نسخه‌ی ۴۷): نقدی، تم تیره، خطاها، زمان تحویل
**تصمیم‌های جدید که تصمیم‌های قبلی را تغییر می‌دهند (به درخواست صریح مالک):**
1. **پرداخت نقدی هنگام تحویل** اضافه شد (قبلاً: فقط درگاه). در تکمیل سفارش دو گزینه‌ی رادیویی؛ هر رستوران می‌تواند آن را با `allowCash` خاموش کند (پیش‌فرض روشن، باید در اپ رستوران هم کنترل شود). نقدی بدون درگاه ثبت می‌شود؛ صفحه‌ی نتیجه «سفارش شما ثبت شد» و «مبلغ قابل پرداخت هنگام تحویل» را نشان می‌دهد. **تعارض:** در اپ پیک نوشته شده «تحویل، بدون دریافت وجه» و در تسویه‌ی رستوران/ادمین فقط پرداخت آنلاین هست؛ باید به‌روز شوند (دریافت وجه توسط پیک، تسویه‌ی نقدی، ثبت وجه دریافتی).
2. **تم روشن/تیره** با کلید در تنظیمات (قبلاً: تم تیره در نسخه‌ی ۱ نباشد). توکن‌ها به متغیرهای CSS تبدیل شد: `--bg --sf --ink --mu --ln --soft --pr2`، پالت تیره: پس‌زمینه #17120F، سطح #241C17، متن #F6EEE8، کم‌رنگ #B3A59B، خط #3A2E27، نرم #3B2117، متن تأکیدی #FF8A5C؛ رنگ اصلی و رنگ‌های وضعیت ثابت می‌مانند. لوگو در تم تیره روشن می‌شود. نقشه‌ی انتخاب آدرس فعلاً همیشه روشن است.
3. **زمان تحویل:** انتخاب زمان و «هرچه زودتر» حذف شد؛ فقط «ارسال حدود X تا Y دقیقه‌ی دیگر» از داده‌ی رستوران. **تعارض:** سوییچ `allowScheduled` و زمان‌بندی در اپ رستوران دیگر استفاده نمی‌شود (داده‌ی خاموش مانده).
**صفحه‌ی خطا (`error`، کامپوننت ErrorPage):** offline، ۵۰۰، ۵۰۳، ۵۰۴، ۴۰۳، ۴۰۴، ۴۰۱ (نشست منقضی). تلاش دوباره = بازگشت به صفحه‌ی قبل؛ ۴۰۳/۴۰۴ = خانه؛ ۴۰۱ = ورود. قطع واقعی اینترنت (رویداد مرورگر) خودکار صفحه‌ی offline را نشان می‌دهد؛ پیش‌نمایش همه از تنظیمات و خطای ۵۰۴ از صفحه‌ی درگاه.
**ثبت‌نام رستوران/پیک:** پیام موفقیت با «پس از بررسی و تأیید، همکاران ما با شما در ارتباط خواهند بود».

### توضیح زمان تحویل (تأیید مالک)
زمان تحویل را رستوران‌دار در اپ خودش تعیین می‌کند (فیلد `etaMin`/`etaMax`، در «ارسال و پیک» اپ رستوران؛ و هنگام «پذیرش با زمان آماده‌سازی» ۱۰/۲۰/۳۰ دقیقه یا دلخواه قابل بازنویسی برای همان سفارش). اپ مشتری فقط نمایش می‌دهد (کارت رستوران، صفحه‌ی رستوران، تکمیل سفارش، پیگیری) و کاربر انتخابی ندارد. پیاده‌سازی فعلی طراحی همین است و تغییر کدی لازم نبود.

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

---

## تغییرات اپ رستوران (طراحی v1 در Claude Design، ۱۴۰۵/۰۹/۳۰)

**ساخته‌شده (کامپوننت‌محور، همان توکن‌ها و فونت اپ مشتری):**
- صفحه‌ها: ورود (موبایل + کد ۴ رقمی)، ثبت‌نام ۴ مرحله‌ای (اطلاعات، مدارک، شبا/تسویه، بررسی)، سفارش‌ها (تب‌های جدید/آماده‌سازی/آماده و در مسیر/تاریخچه)، جزئیات سفارش، منو، ویرایش/افزودن غذا، گزارش‌ها + تسویه، حساب، ساعت کاری، تنظیمات تحویل و پرداخت، اطلاعات رستوران، صدا و اعلان، راهنما.
- Overlayها: هشدار تمام‌صفحه‌ی سفارش جدید (تایمر ۳ دقیقه، بی‌پاسخی = لغو)، زمان آماده‌سازی، دلیل رد، تأیید، Toast، خطای آفلاین.
- ریسپانسیو: prop به نام `layout` (auto/phone/tablet)؛ تبلت = ریل کناری + لیست/جزئیات دو ستونه. فایل `AppTablet` نسخه‌ی تولیدشده از App است و با هم باید به‌روز شوند.
- تفاوت عمدی با اپ مشتری: سربرگ تیره‌ی «کسب‌وکار» + برچسب «رستوران»، نوار ناوبری تخت ۴ تبی، دکمه‌ی سبز پذیرش و دکمه‌ی بیرون‌خط رد، کارت سفارش با وضعیت رنگی (بدون آبی).
- کامپوننت‌های جدید: RHeader, RBottomNav, SegTabs, OrderTile, NewOrderAlert, PrepSheet, ReasonSheet, OrderDetail, MenuItemRow, StatCard, BarChart, HoursRow, OptionGroupCard, TextField, WizardBar, ConfirmDialog, Toast, UploadTile, SoundPanel.

**اصلاح تعارض‌های بخش رستوران در این سند:** `allowScheduled` حذف شد (زمان‌بندی نداریم)؛ `allowCash` و `allowExtras` اضافه شد؛ زمان تحویل را رستوران هنگام پذیرش تعیین می‌کند و فقط نمایش داده می‌شود؛ پیک پول نقد را می‌گیرد؛ شماره‌ی مشتری فقط ماسک‌شده؛ شبا فقط ماسک‌شده و تغییرش نیازمند OTP تازه + بررسی ادمین.

**تصمیم‌های باز:** فرمول ETA برای مشتری (آماده‌سازی + مسیر)؛ قانون تسویه‌ی نقدی بین دکون/رستوران/پیک؛ کیف پول؛ آپلود واقعی مدارک؛ صدای هشدار فقط بوق ساده است و برای اپ نهایی باید فایل صدای واقعی و Push داشته باشیم؛ نمایش «تبلت» نسخه‌ی کپی است.
**راستی‌آزمایی:** هیچ‌کدام در مرورگر بررسی نشده؛ فقط سینتکس جاوااسکریپت چک شد.

### به‌روزرسانی اپ رستوران v2 (۱۴۰۵/۰۹/۳۰)
- **رنگ:** سبز از اپ رستوران حذف شد. کلیدهای روشن/باز = نارنجی (#E4501E)، خاموش = خاکستری قبلی؛ پذیرش = نارنجی، «آماده» = قهوه‌ای‌قرمز (#8B2313)، تحویل به پیک = مشکی. (کامپوننت‌های مشترک Badge/PriceSummary که در اپ رستوران استفاده نمی‌شوند هنوز نسخه‌ی سبز اپ مشتری را دارند.)
- **صفحه‌های جدید:** ویرایشگر گروه گزینه (عنوان، اجباری، حداکثر انتخاب، گزینه‌ها و قیمت، حذف)، مدیریت دسته‌های منو، جزئیات تسویه، اعلان‌ها، ارسال پیام به پشتیبانی.
- **کامپوننت جدید:** OptionEditRow.
- **باز:** درصد کمیسیون و قانون تسویه‌ی نقدی (اعداد تسویه نمونه است).

### مدارک ثبت‌نام رستوران (تصمیم)
- فهرست مدارک ثابت داخل اپ نیست؛ از API می‌آید (`docTypes`: id، عنوان، توضیح، اجباری/اختیاری، نوع فایل مجاز، مرحله‌ی نمایش) و از پنل ادمین قابل افزودن/ویرایش است. اپ فهرست را داینامیک رندر می‌کند و دکمه‌ی «ادامه» فقط وقتی فعال می‌شود که همه‌ی مدارک اجباری بارگذاری شده باشد.
- اگر بعداً مدرک تازه‌ای اجباری شد، برای رستوران‌های فعلی اعلان می‌رود و از «اطلاعات رستوران» بارگذاری می‌کنند.
- کمیسیون پیش‌فرض ۱۲٪، متغیر از پنل ادمین (پیش‌فرض + استثنای هر رستوران)؛ عکس غذا قبل از نمایش تأیید دکون می‌خواهد.

### صفحه‌ی «شروع شیفت» (اپ/پنل رستوران)
بعد از ورود نمایش داده می‌شود: سه نکته (صفحه باز بماند، صدا تأیید شود، نمایشگر خاموش نشود) و دکمه‌ی «شروع شیفت و فعال‌سازی صدا». ورود به سفارش‌ها فقط از همین دکمه است.
