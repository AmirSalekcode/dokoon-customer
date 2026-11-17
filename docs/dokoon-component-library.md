# کتابخانه‌ی کامپوننت‌های دکون (اپ مشتری، نسخه‌ی ۴۸)

> استخراج‌شده از کد پروتوتایپ؛ نام و props دقیقاً همان‌هایی‌اند که در `data-props` هر کامپوننت تعریف شده‌اند. هر کامپوننت data-driven است (بدون داده‌ی سخت‌کدشده) و فقط از توکن‌های `dokoon-tokens.css` استفاده می‌کند. مصرف = تعداد استفاده در `App.dc.html`.

## قواعد کلی
- هر کامپوننت: ورودی فقط props؛ رویدادها با پیشوند `on` (callback)؛ بدون state مشترک؛ حالت‌ها (selected, disabled, open, loading) با props.
- تمام رنگ‌ها `var(--token,#fallback)`؛ جهت RTL؛ اعداد فارسی را والد فرمت می‌کند (مگر Price که خودش فرمت می‌کند).
- هندلر ورودی متن باید هم رویداد و هم رشته را بپذیرد (در پیاده‌سازی واقعی: `value = e?.target?.value ?? e`).
- سبد خرید یکی است و بین رستوران/سبد/تکمیل سفارش مشترک.

## فهرست

| کامپوننت | هدف | props | رویدادها | مصرف |
|---|---|---|---|---|
| **ActionBar** | دکمه‌ی اصلی چسبان پایین صفحه با مبلغ (CTA). | `label`, `valueText`, `disabled` | `onTap` | 3 |
| **Badge** | نشان کوچک رنگی (قرمز پیش‌فرض، amber، green، ink). | `text`, `tone` | — | 1 |
| **BottomNav** | نوار ناوبری پایین: خانه، رستوران‌ها، سبد (مرکز، با نشان تعداد)، پیشنهادها، حساب. | `active`, `cartBadge` | `onPick` | 4 |
| **CartItemRow** | ردیف آیتم سبد با نام، گزینه‌ها، قیمت و استپر تعداد. | `item`, `qtyText` | `onInc`, `onDec` | 1 |
| **CartSummary** | نوار شناور خلاصه‌ی سبد (تعداد و جمع) روی صفحه‌ی رستوران؛ رنگ ثابت dock. | `count`, `total` | `onOpen` | 1 |
| **CategoryItem** | آیتم دایره‌ای/کارتی دسته‌بندی با هنر و عنوان. | `title`, `art`, `selected` | `onPick` | 2 |
| **ChoiceSheet** | شیت انتخاب از فهرست (آدرس، شهر...) با دکمه‌ی افزودن اختیاری. | `title`, `options`, `addLabel` | `onClose`, `onAdd` | 1 |
| **ContactRow** | ردیف تماس/لینک (تلفن، پیام) با آیکون. | `title`, `sub`, `art`, `href` | — | 4 |
| **CouponCard** | کارت کد تخفیف با نشان، عنوان، کد و دکمه‌ی استفاده/کپی. | `badge`, `title`, `sub`, `code`, `cta` | `onUse` | 2 |
| **EmptyState** | حالت خالی با هنر، عنوان و متن. | `art`, `title`, `text` | — | 11 |
| **ErrorPage** | صفحه‌ی خطای تمام‌صفحه با کد، عنوان، متن، آیکون و دو دکمه. | `code`, `title`, `text`, `d`, `cta`, `ctaSecondary` | `onPrimary`, `onSecondary` | 1 |
| **ErrorState** | خطای درون‌صفحه‌ای با دکمه‌ی تلاش دوباره. | `title`, `text` | `onRetry` | 1 |
| **FaqItem** | آکاردئون پرسش و پاسخ. | `q`, `a`, `open` | `onToggle` | 2 |
| **FilterChip** | چیپ قابل انتخاب (با آیکون اختیاری). | `label`, `selected`, `art` | `onPick` | 6 |
| **FilterSheet** | شیت فیلتر: مرتب‌سازی، کلیدها، برچسب‌ها، امتیاز، پاک‌کردن/اعمال با شمارنده‌ی نتایج. | `sort`, `toggles`, `tags`, `ratings`, `countText` | `onClear`, `onApply` | 1 |
| **FoodCard** | کارت غذا با تصویر، قیمت، تخفیف، افزودن و استپر. | `f`, `qtyText` | `onOpen`, `onAdd`, `onInc`, `onDec` | 1 |
| **FoodDetails** | شیت جزئیات غذا: گزینه‌ها، تعداد، امتیاز و نظرات، دکمه‌ی افزودن به سبد. | `food`, `qtyText`, `totalText`, `canAdd`, `ctaLabel`, `noteValue` | `onClose`, `onInc`, `onDec`, `onNote`, `onAdd`, `onReview`, `onScroll` | 1 |
| **Header** | هدر خانه: همبرگری (راست)، چیپ آدرس (وسط)، لوگو (چپ)، سبد. | `cartCount`, `hasCart`, `address` | `onMenu`, `onCart`, `onAddress` | 1 |
| **InfoList** | فهرست کلید/مقدار برای اطلاعات سفارش و رستوران. | `rows` | — | 3 |
| **ListRow** | ردیف عمومی با آیکون/هنر، عنوان، زیرعنوان، متا و نقطه‌ی اعلان. | `title`, `sub`, `meta`, `art`, `d`, `dot` | `onTap` | 11 |
| **LoadingState** | اسکلتون shimmer. | — | — | 1 |
| **MapPicker** | انتخاب نقطه روی نقشه با پین، بررسی محدوده‌ی سرویس و دکمه‌ی موقعیت من. | `pinX`, `pinY`, `inZone`, `locating` | `onPick`, `onLocate` | 1 |
| **MenuDrawer** | منوی همبرگری کشویی: سلام {نام} عزیز، شهر، گروه‌ها، نسخه. | `user`, `city`, `groups`, `version` | `onClose` | 1 |
| **MenuList** | فهرست گروه‌بندی‌شده‌ی منو/حساب (data-driven). | `groups` | — | 1 |
| **OrderCard** | کارت سفارش با وضعیت، آیتم‌ها، مبلغ و دکمه‌ی اقدام. | `order` | `onOpen`, `onAction` | 1 |
| **Price** | قیمت با قیمت قبلی خط‌خورده (ارقام فارسی + تومان). | `price`, `old` | — | 0 |
| **PriceSummary** | جدول جمع: ردیف‌ها و جمع کل. | `rows`, `totalLabel`, `totalValue` | — | 3 |
| **PromoCodeInput** | ورودی کد تخفیف با وضعیت ok/err و پیام. | `value`, `status`, `message` | `onInput`, `onApply` | 2 |
| **QuantityStepper** | استپر تعداد − / +. | `value` | `onInc`, `onDec` | 0 |
| **Rating** | ستاره + عدد + تعداد نظر. | `value`, `count` | — | 0 |
| **RestaurantCard** | کارت رستوران: کاور، نشان، امتیاز، زمان ارسال، هزینه، علاقه‌مندی. | `r` | `onOpen`, `onFav` | 5 |
| **RestaurantHeader** | هدر صفحه‌ی رستوران: کاور، بازگشت، علاقه‌مندی، اشتراک، اطلاعات. | `r` | `onBack`, `onFav`, `onShare` | 1 |
| **ReviewSheet** | شیت ثبت نظر: ستاره + متن. | `foodName`, `starItems`, `starLabel`, `text`, `canSubmit` | `onText`, `onSubmit`, `onClose` | 1 |
| **SearchBar** | نوار جستجو (قابل‌ویرایش یا فقط تپ) با دکمه‌ی فیلتر و شمارنده. | `placeholder`, `value`, `editable`, `showFilter`, `filterCount` | `onInput`, `onFilter`, `onTap` | 4 |
| **SelectCard** | کارت انتخاب رادیویی/تکی با آیکون و اکشن (آدرس، پرداخت). | `title`, `sub`, `icon`, `selected`, `radio`, `actionLabel` | `onPick`, `onAction` | 5 |
| **SocialCard** | کارت شبکه‌ی اجتماعی با نام کاربری و دکمه. | `title`, `sub`, `handle`, `d`, `cta` | `onOpen` | 1 |
| **StarPicker** | انتخاب امتیاز با ستاره‌ها. | `items`, `label` | — | 3 |
| **StepBar** | نوار مراحل عمودی/افقی وضعیت سفارش. | `steps` | — | 1 |
| **ToggleRow** | ردیف با کلید روشن/خاموش. | `title`, `sub`, `on` | `onFlip` | 2 |
| **TopBar** | نوار بالای صفحه با عنوان، بازگشت، اکشن اختیاری. | `title`, `actionLabel` | `onBack`, `onAction` | 26 |

## جزئیات هر کامپوننت

### ActionBar
- هدف: دکمه‌ی اصلی چسبان پایین صفحه با مبلغ (CTA).
- مصرف: ادامه/پرداخت/ثبت سفارش
- props: label, valueText, disabled؛ رویدادها: onTap
- توکن‌های استفاده‌شده: --ln, --mu, --sf
- اندازه‌ی پیش‌نمایش: 390×88

### Badge
- هدف: نشان کوچک رنگی (قرمز پیش‌فرض، amber، green، ink).
- مصرف: برچسب پرفروش/تخفیف/جدید
- props: text, tone؛ رویدادها: —
- توکن‌های استفاده‌شده: --ink
- واریانت‌ها: amber, green, ink

### BottomNav
- هدف: نوار ناوبری پایین: خانه، رستوران‌ها، سبد (مرکز، با نشان تعداد)، پیشنهادها، حساب.
- مصرف: صفحات تب اصلی
- props: active, cartBadge؛ رویدادها: onPick
- توکن‌های استفاده‌شده: --bg, --mu, --pr2, --sf
- واریانت‌ها: on

### CartItemRow
- هدف: ردیف آیتم سبد با نام، گزینه‌ها، قیمت و استپر تعداد.
- مصرف: سبد خرید
- props: item, qtyText؛ رویدادها: onInc, onDec
- توکن‌های استفاده‌شده: --ink, --mu, --sf, --soft
- اندازه‌ی پیش‌نمایش: 358×120

### CartSummary
- هدف: نوار شناور خلاصه‌ی سبد (تعداد و جمع) روی صفحه‌ی رستوران؛ رنگ ثابت dock.
- مصرف: صفحه‌ی رستوران
- props: count, total؛ رویدادها: onOpen
- توکن‌های استفاده‌شده: --sf

### CategoryItem
- هدف: آیتم دایره‌ای/کارتی دسته‌بندی با هنر و عنوان.
- مصرف: خانه، رستوران‌ها
- props: title, art, selected؛ رویدادها: onPick
- توکن‌های استفاده‌شده: --ink, --pr2, --sf, --soft
- واریانت‌ها: on

### ChoiceSheet
- هدف: شیت انتخاب از فهرست (آدرس، شهر...) با دکمه‌ی افزودن اختیاری.
- مصرف: انتخاب آدرس
- props: title, options, addLabel؛ رویدادها: onClose, onAdd
- توکن‌های استفاده‌شده: --bg, --ink, --ln, --pr2, --sf, --soft
- اندازه‌ی پیش‌نمایش: 390×420

### ContactRow
- هدف: ردیف تماس/لینک (تلفن، پیام) با آیکون.
- مصرف: پشتیبانی، پیگیری سفارش
- props: title, sub, art, href؛ رویدادها: —
- توکن‌های استفاده‌شده: --ink, --mu, --sf, --soft
- اندازه‌ی پیش‌نمایش: 358×96

### CouponCard
- هدف: کارت کد تخفیف با نشان، عنوان، کد و دکمه‌ی استفاده/کپی.
- مصرف: کدهای تخفیف، پیشنهادها
- props: badge, title, sub, code, cta؛ رویدادها: onUse
- توکن‌های استفاده‌شده: --ink, --mu, --pr2, --sf, --soft
- اندازه‌ی پیش‌نمایش: 358×100

### EmptyState
- هدف: حالت خالی با هنر، عنوان و متن.
- مصرف: همه‌ی فهرست‌ها
- props: art, title, text؛ رویدادها: —
- توکن‌های استفاده‌شده: --ink, --mu

### ErrorPage
- هدف: صفحه‌ی خطای تمام‌صفحه با کد، عنوان، متن، آیکون و دو دکمه.
- مصرف: offline/5xx/4xx
- props: code, title, text, d, cta, ctaSecondary؛ رویدادها: onPrimary, onSecondary
- توکن‌های استفاده‌شده: --bg, --ink, --mu, --pr2, --soft
- اندازه‌ی پیش‌نمایش: 390×640

### ErrorState
- هدف: خطای درون‌صفحه‌ای با دکمه‌ی تلاش دوباره.
- مصرف: بارگذاری ناموفق لیست
- props: title, text؛ رویدادها: onRetry
- توکن‌های استفاده‌شده: --ink, --mu, --pr2, --sf

### FaqItem
- هدف: آکاردئون پرسش و پاسخ.
- مصرف: پشتیبانی
- props: q, a, open؛ رویدادها: onToggle
- توکن‌های استفاده‌شده: --ink, --mu, --sf
- واریانت‌ها: on
- اندازه‌ی پیش‌نمایش: 358×56

### FilterChip
- هدف: چیپ قابل انتخاب (با آیکون اختیاری).
- مصرف: فیلتر و دسته‌بندی
- props: label, selected, art؛ رویدادها: onPick
- توکن‌های استفاده‌شده: --ink, --ln, --pr2, --sf, --soft
- واریانت‌ها: on

### FilterSheet
- هدف: شیت فیلتر: مرتب‌سازی، کلیدها، برچسب‌ها، امتیاز، پاک‌کردن/اعمال با شمارنده‌ی نتایج.
- مصرف: رستوران‌ها، جستجو
- props: sort, toggles, tags, ratings, countText؛ رویدادها: onClear, onApply
- توکن‌های استفاده‌شده: --bg, --ink, --ln, --mu, --pr2, --sf
- واریانت‌ها: on

### FoodCard
- هدف: کارت غذا با تصویر، قیمت، تخفیف، افزودن و استپر.
- مصرف: منوی رستوران، جستجو
- props: f, qtyText؛ رویدادها: onOpen, onAdd, onInc, onDec
- توکن‌های استفاده‌شده: --ink, --ln, --mu, --sf, --soft
- واریانت‌ها: off

### FoodDetails
- هدف: شیت جزئیات غذا: گزینه‌ها، تعداد، امتیاز و نظرات، دکمه‌ی افزودن به سبد.
- مصرف: صفحه‌ی رستوران
- props: food, qtyText, totalText, canAdd, ctaLabel, noteValue؛ رویدادها: onClose, onInc, onDec, onNote, onAdd, onReview, onScroll
- توکن‌های استفاده‌شده: --bg, --ink, --ln, --mu, --pr2, --sf, --soft
- واریانت‌ها: on, op2, rq, sq

### Header
- هدف: هدر خانه: همبرگری (راست)، چیپ آدرس (وسط)، لوگو (چپ)، سبد.
- مصرف: خانه
- props: cartCount, hasCart, address؛ رویدادها: onMenu, onCart, onAddress
- توکن‌های استفاده‌شده: --ink, --mu, --sf, --soft

### InfoList
- هدف: فهرست کلید/مقدار برای اطلاعات سفارش و رستوران.
- مصرف: پیگیری، اطلاعات رستوران
- props: rows؛ رویدادها: —
- توکن‌های استفاده‌شده: --ink, --ln, --mu, --sf
- اندازه‌ی پیش‌نمایش: 358×220

### ListRow
- هدف: ردیف عمومی با آیکون/هنر، عنوان، زیرعنوان، متا و نقطه‌ی اعلان.
- مصرف: حساب، اعلان‌ها، تنظیمات
- props: title, sub, meta, art, d, dot؛ رویدادها: onTap
- توکن‌های استفاده‌شده: --ink, --mu, --pr2, --sf, --soft
- اندازه‌ی پیش‌نمایش: 358×72

### LoadingState
- هدف: اسکلتون shimmer.
- مصرف: همه‌ی فهرست‌ها
- props: —؛ رویدادها: —
- توکن‌های استفاده‌شده: --ln, --soft

### MapPicker
- هدف: انتخاب نقطه روی نقشه با پین، بررسی محدوده‌ی سرویس و دکمه‌ی موقعیت من.
- مصرف: افزودن آدرس
- props: pinX, pinY, inZone, locating؛ رویدادها: onPick, onLocate
- توکن‌های استفاده‌شده: --bg, --ink, --pr2, --sf
- واریانت‌ها: busy
- اندازه‌ی پیش‌نمایش: 358×240

### MenuDrawer
- هدف: منوی همبرگری کشویی: سلام {نام} عزیز، شهر، گروه‌ها، نسخه.
- مصرف: همه‌ی صفحات تب‌ها
- props: user, city, groups, version؛ رویدادها: onClose
- توکن‌های استفاده‌شده: --bg, --ink, --ln, --mu, --pr2, --sf, --soft
- واریانت‌ها: out

### MenuList
- هدف: فهرست گروه‌بندی‌شده‌ی منو/حساب (data-driven).
- مصرف: حساب، همبرگری
- props: groups؛ رویدادها: —
- توکن‌های استفاده‌شده: --ink, --mu, --pr2, --sf, --soft
- واریانت‌ها: out
- اندازه‌ی پیش‌نمایش: 358×520

### OrderCard
- هدف: کارت سفارش با وضعیت، آیتم‌ها، مبلغ و دکمه‌ی اقدام.
- مصرف: سفارش‌ها
- props: order؛ رویدادها: onOpen, onAction
- توکن‌های استفاده‌شده: --ink, --ln, --mu, --pr2, --sf, --soft
- واریانت‌ها: pri, sec
- اندازه‌ی پیش‌نمایش: 358×260

### Price
- هدف: قیمت با قیمت قبلی خط‌خورده (ارقام فارسی + تومان).
- مصرف: همه‌جا
- props: price, old؛ رویدادها: —
- توکن‌های استفاده‌شده: --ink, --mu

### PriceSummary
- هدف: جدول جمع: ردیف‌ها و جمع کل.
- مصرف: سبد، تکمیل سفارش، پیگیری
- props: rows, totalLabel, totalValue؛ رویدادها: —
- توکن‌های استفاده‌شده: --ink, --ln, --mu, --sf
- واریانت‌ها: good
- اندازه‌ی پیش‌نمایش: 358×200

### PromoCodeInput
- هدف: ورودی کد تخفیف با وضعیت ok/err و پیام.
- مصرف: سبد
- props: value, status, message؛ رویدادها: onInput, onApply
- توکن‌های استفاده‌شده: --ink, --mu, --pr2, --sf, --soft
- واریانت‌ها: err, ok
- اندازه‌ی پیش‌نمایش: 358×88

### QuantityStepper
- هدف: استپر تعداد − / +.
- مصرف: کارت غذا، سبد
- props: value؛ رویدادها: onInc, onDec
- توکن‌های استفاده‌شده: --ink, --pr2, --sf, --soft

### Rating
- هدف: ستاره + عدد + تعداد نظر.
- مصرف: کارت‌ها
- props: value, count؛ رویدادها: —
- توکن‌های استفاده‌شده: --ink, --mu

### RestaurantCard
- هدف: کارت رستوران: کاور، نشان، امتیاز، زمان ارسال، هزینه، علاقه‌مندی.
- مصرف: خانه، لیست، جستجو
- props: r؛ رویدادها: onOpen, onFav
- توکن‌های استفاده‌شده: --ink, --mu, --sf, --soft
- واریانت‌ها: free, on

### RestaurantHeader
- هدف: هدر صفحه‌ی رستوران: کاور، بازگشت، علاقه‌مندی، اشتراک، اطلاعات.
- مصرف: صفحه‌ی رستوران
- props: r؛ رویدادها: onBack, onFav, onShare
- توکن‌های استفاده‌شده: --ink, --ln, --mu, --pr2, --sf, --soft
- واریانت‌ها: no, ok, on

### ReviewSheet
- هدف: شیت ثبت نظر: ستاره + متن.
- مصرف: نظر غذا
- props: foodName, starItems, starLabel, text, canSubmit؛ رویدادها: onText, onSubmit, onClose
- توکن‌های استفاده‌شده: --bg, --ink, --ln, --mu, --pr2, --sf
- واریانت‌ها: on
- اندازه‌ی پیش‌نمایش: 390×420

### SearchBar
- هدف: نوار جستجو (قابل‌ویرایش یا فقط تپ) با دکمه‌ی فیلتر و شمارنده.
- مصرف: خانه، جستجو، رستوران‌ها
- props: placeholder, value, editable, showFilter, filterCount؛ رویدادها: onInput, onFilter, onTap
- توکن‌های استفاده‌شده: --ink, --mu, --sf

### SelectCard
- هدف: کارت انتخاب رادیویی/تکی با آیکون و اکشن (آدرس، پرداخت).
- مصرف: تکمیل سفارش
- props: title, sub, icon, selected, radio, actionLabel؛ رویدادها: onPick, onAction
- توکن‌های استفاده‌شده: --ink, --ln, --mu, --pr2, --sf, --soft
- واریانت‌ها: on
- اندازه‌ی پیش‌نمایش: 358×88

### SocialCard
- هدف: کارت شبکه‌ی اجتماعی با نام کاربری و دکمه.
- مصرف: شبکه‌های اجتماعی
- props: title, sub, handle, d, cta؛ رویدادها: onOpen
- توکن‌های استفاده‌شده: --ink, --mu, --pr2, --sf, --soft
- اندازه‌ی پیش‌نمایش: 358×88

### StarPicker
- هدف: انتخاب امتیاز با ستاره‌ها.
- مصرف: امتیاز سفارش
- props: items, label؛ رویدادها: —
- توکن‌های استفاده‌شده: --ink, --ln, --pr2
- واریانت‌ها: on
- اندازه‌ی پیش‌نمایش: 358×80

### StepBar
- هدف: نوار مراحل عمودی/افقی وضعیت سفارش.
- مصرف: پیگیری سفارش
- props: steps؛ رویدادها: —
- توکن‌های استفاده‌شده: --ink, --ln, --mu, --sf, --soft
- واریانت‌ها: cur, done
- اندازه‌ی پیش‌نمایش: 358×340

### ToggleRow
- هدف: ردیف با کلید روشن/خاموش.
- مصرف: تنظیمات
- props: title, sub, on؛ رویدادها: onFlip
- توکن‌های استفاده‌شده: --ink, --ln, --mu, --sf
- واریانت‌ها: on
- اندازه‌ی پیش‌نمایش: 358×72

### TopBar
- هدف: نوار بالای صفحه با عنوان، بازگشت، اکشن اختیاری.
- مصرف: همه‌ی صفحات داخلی
- props: title, actionLabel؛ رویدادها: onBack, onAction
- توکن‌های استفاده‌شده: --ink, --pr2, --sf
- اندازه‌ی پیش‌نمایش: 390×80

## ترکیب‌های سطح بالا (Patterns)
- **صفحه‌ی لیست**: TopBar + SearchBar/FilterChip + (LoadingState | EmptyState | ErrorState | فهرست کارت‌ها) + BottomNav.
- **صفحه‌ی فرم**: TopBar + فیلدها + ActionBar (دکمه غیرفعال تا اعتبارسنجی).
- **شیت**: scrim + محتوا (FilterSheet, FoodDetails, ReviewSheet, ChoiceSheet) با بستن از scrim.
- **دیالوگ تأیید**: overlay `dlg/confirm/delconfirm` با داده‌ی عنوان/متن/دو دکمه.

## کامپوننت‌های پیشنهادی که هنوز نیستند (برای فاز فرانت)
Button (primary/secondary/danger/ghost، اندازه‌ها)، TextField (برچسب/خطا/راهنما/ماسک موبایل)، OtpInput، Toast/Snackbar، Skeleton با ابعاد، Avatar، Dialog عمومی، Image با placeholder، Tabs. در پروتوتایپ این‌ها inline ساخته شده‌اند و باید به کامپوننت تبدیل شوند.
