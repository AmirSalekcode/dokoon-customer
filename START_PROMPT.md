# پرامپت شروع برای Claude Code

(پوشه‌ی `dokoon` را در یک پوشه‌ی خالی بگذارید، داخلش Claude Code را باز کنید و این متن را بدهید.)

---
این پروژه «دکون»، اپ سفارش غذای فارسی است. فقط **اپ مشتری** را می‌سازیم. اول `CLAUDE.md` و بعد `docs/dokoon-frontend-kickoff.md` و `docs/dokoon-screen-specs.md` را کامل بخوان. طراحی بصری مرجع در `prototype/` است.

کار مرحله‌ی اول (فقط پایه، هنوز صفحه‌ی کامل نساز):
1. پروژه‌ی React + TypeScript + Vite با ساختار تمیز بساز (git init، ESLint، Prettier، Vitest، Playwright)، PWA (manifest + service worker) و RTL فارسی.
2. `design-tokens/dokoon-tokens.css` و فونت‌های `assets/fonts` را وارد کن و تم روشن/تیره با کلید تعویض بساز.
3. از `contract/dokoon-openapi.yaml` کلاینت API با TypeScript تولید کن و یک mock server (Prism یا MSW) راه بینداز که با داده‌ی نمونه کار کند.
4. لایه‌های `MapProvider` (نشان/بلد)، `PaymentProvider`، `PushProvider` را فقط به‌صورت رابط + پیاده‌سازی ساختگی بساز.
5. ناوبری با پشته (back دقیق + دکمه‌ی back اندروید)، اوورلی‌ها، سبد یکتا، لایه‌ی خطا (ErrorPage) و صفحه‌ی offline.
6. کامپوننت‌های پایه (Button، TextField، Sheet، Dialog، Toast) و بعد ۴۰ کامپوننت کتابخانه از `docs/dokoon-component-library.md` با Storybook.
7. Capacitor اندروید را اضافه کن و مطمئن شو APK دیباگ ساخته می‌شود.

در پایان این مرحله با فارسی ساده گزارش بده: چه چیزهایی را **واقعاً اجرا و تست کردی**، چه چیزی مانده، و چه تصمیم‌هایی از من لازم داری. بعد منتظر تأیید من بمان تا برویم سراغ صفحات به ترتیب: ورود → خانه و رستوران → سبد و تکمیل سفارش → پیگیری → پرداخت آنلاین → حساب.
---
