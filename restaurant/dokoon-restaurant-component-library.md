# کتابخانه‌ی کامپوننت اپ رستوران دکون — v1

> مکمل `dokoon-component-library.md`. قواعد کلی همان‌هاست: فقط props، رویدادها با پیشوند `on`، بدون داده‌ی سخت‌کدشده، فقط توکن‌ها. **هرجا در پروتوتایپ prop به نام `name` ممنوع است** (در سیستم Claude Design)؛ در React می‌توانید `name` بگذارید، ولی پروتوتایپ از `rest` در RHeader استفاده کرده.

## ۱. کامپوننت‌های مشترک با اپ مشتری (بدون تغییر منطق)
TopBar، Badge، EmptyState، ErrorPage، ErrorState، LoadingState، ToggleRow، ListRow، ActionBar، FilterChip، SearchBar، InfoList، PriceSummary، StepBar، FaqItem، ContactRow، Price، SelectCard، MapPicker، QuantityStepper. (ToggleRow در حالت روشن نارنجی است.)

## ۲. کامپوننت‌های جدید رستوران (۲۰ عدد)
| کامپوننت | هدف | props | رویدادها | اندازه‌ی نمونه |
|---|---|---|---|---|
| **RHeader** | سربرگ تیره: لوگو، برچسب «رستوران»، نام، زیرعنوان، کلید باز/بسته (قرص با نقطه) | `rest` (نام)، `sub`، `open` | `onToggle` | 390×148 |
| **RBottomNav** | ناوبری ۴ تبی؛ `rail` = ریل کناری | `items[{key,label,d,badge}]`، `active`، `rail` | `onPick(key)` | 390×76 |
| **SegTabs** | تب‌های قرصی با شمارنده‌ی اختیاری و `hot` | `items[{key,label,count,hot}]`، `active` | `onPick(key)` | 390×64 |
| **OrderTile** | کارت سفارش در لیست | `order{no,name,itemsText,total,statusLabel,tone,timeText,pay,payLabel,extraText}`، `actionLabel`، `actionTone`، `selected` | `onOpen`، `onAction` | 358×250 |
| **NewOrderAlert** | هشدار تمام‌صفحه‌ی سفارش جدید، تایمر دایره‌ای | `order{no,items[{q,name,opt}],note,pay,payLabel,total}`، `timerText`، `progress` (۰..۱)، `muted` | `onAccept`، `onReject`، `onMute` | 390×844 |
| **PrepSheet** | انتخاب زمان آماده‌سازی (۱۵/۲۰/۳۰/۴۰/دلخواه) | `opts[{key,big,small,on}]`، `custom`، `customVal`، `preview`، `canConfirm` | `onPick`، `onStep(±5)`، `onConfirm`، `onClose` | 390×560 |
| **ReasonSheet** | انتخاب دلیل (رد سفارش) | `title`، `text`، `items[{id,label,on}]`، `confirmLabel`، `canConfirm` | `onPick(id)`، `onConfirm`، `onClose` | 390×500 |
| **OrderDetail** | جزئیات کامل سفارش (اقلام، توضیح، جمع، پرداخت، مشتری ماسک‌شده، پیک، اقدام‌ها) | `order{no,statusLabel,tone,placed,etaText,canAddTime,items,note,rows,total,pay,payText,customer,area,courier,primary{label,tone},secondaryLabel}` | `onPrimary`، `onSecondary`، `onAddTime`، `onPrint`، `onCall` | 358×900 |
| **MenuItemRow** | ردیف غذا با کلید موجود/ناموجود؛ با تخفیف یک خط نشان + مدت + «پایان تخفیف» | `item{name,price,old,art,available,discount?{badge,ends}}` | `onToggle`، `onEdit`، `onEndDiscount` | 358×96 (+۵۶ با تخفیف) |
| **JalaliDatePicker** | تقویم شمسی ماه‌به‌ماه (شنبه اول)، روزهای گذشته غیرفعال، روز انتخابی نارنجی | `months` (از `calendarMonths`)، `value` (روز تهران `YYYY-MM-DD`)، `label` | `onPick(iso)` | 358×~۴۰۰ |
| **StatCard** | کارت آمار | `label`، `value`، `sub`، `d` (آیکون)، `tone` (up/down) | — | 172×116 |
| **BarChart** | نمودار میله‌ای ساده (دسترس‌پذیر با role=img) | `title`، `bars[{label,v,h,on}]` | — | 358×220 |
| **HoursRow** | یک روز هفته: کلید، از/تا | `day`، `on`، `from`، `to`، `times[]` | `onFlip`، `onFrom`، `onTo` | 358×120 |
| **OptionGroupCard** | کارت گروه گزینه با دکمه‌های افزودن/ویرایش/حذف | `group{title,required,rule,options[{name,price}]}` | `onAdd`، `onEdit`، `onDelete` | 358×240 |
| **OptionEditRow** | ردیف ویرایش یک گزینه (نام + قیمت + حذف) | `optName`، `optPrice` | `onName`، `onPrice`، `onDelete` | 358×96 |
| **TextField** | فیلد متنی چندمنظوره (برچسب، خطا، راهنما، پسوند، چندخطی، ltr) | `label`، `value`، `placeholder`، `hint`، `error`، `suffix`، `ltr`، `rows`، `inputmode` | `onInput(value)` | 358×96 |
| **WizardBar** | نوار مراحل ثبت‌نام | `steps[{label,state: done/cur/todo}]` | — | 358×80 |
| **ConfirmDialog** | پنجره‌ی تأیید | `title`، `text`، `confirmLabel`، `cancelLabel`، `tone` (danger/ok) | `onConfirm`، `onCancel` | 358×240 |
| **Toast** | پیام کوتاه (۲٫۶ ثانیه، `role=status`) | `text`، `tone` (warn) | — | 358×72 |
| **UploadTile** | کاشی بارگذاری با حالت انجام‌شده | `label`، `sub`، `d`، `done` | `onTap` | 172×128 |
| **SoundPanel** | آزمایش صدا (پخش/توقف، ۵ سطح بلندی) | `playing`، `level`، `tone` | `onPlay`، `onLevel(n)` | 358×300 |

## ۳. قواعد استفاده
- **نشان وضعیت سفارش** (`tone`): `new`، `prep`، `ready`، `way`، `done`، `bad` ↔ رنگ‌ها در design-system بخش ۲. متن وضعیت از API می‌آید (`statusLabel`) نه از کامپوننت.
- **دکمه‌ی اقدام اصلی** (`actionTone`): پیش‌فرض نارنجی (پذیرش)، `ok` = قهوه‌ای‌قرمز (آماده)، `dark` = مشکی (تحویل به پیک).
- `OrderDetail` هم صفحه‌ی موبایل است هم پنل کناری تبلت؛ همان کامپوننت.
- مبالغ و اعداد را والد فارسی‌فرمت می‌کند (`Intl.NumberFormat('fa-IR')`)، قیمت گزینه‌ها در `OptionEditRow` عدد انگلیسی/فارسی ورودی را نرمال کند.
- شماره‌ی مشتری و شبا همیشه ماسک‌شده از سرور می‌آید؛ کامپوننت هرگز مقدار کامل نمی‌گیرد.
