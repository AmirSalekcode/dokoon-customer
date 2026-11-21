# کتابخانه‌ی کامپوننت پیک
همه‌ی کامپوننت‌ها فقط با props داده می‌گیرند (بدون نام/قیمت ثابت). رویدادها `onX`.

## اختصاصی پیک
| کامپوننت | props | توضیح |
|---|---|---|
| CHeader | who, sub, earn | هدر نارنجی: نام پیک، توضیح، درآمد امروز |
| OnlineSwitch | online, note, onFlip | کلید بزرگ آنلاین (role=switch)، پالس نارنجی در حالت آنلاین |
| OfferCard | offer{rest,earn,from,to,dist,time,pay,cash}, onOpen | کارت پیشنهاد؛ فقط محله، نه آدرس کامل |
| OfferAlert | offer{…,d1,d2}, timerText, progress(0..1), onAccept, onReject | تمام‌صفحه، تایمر ۳۰ ثانیه، پذیرش اتمیک سمت سرور |
| RouteMap | label, etaText, distText, tracking, onNeshan, onBalad | نقشه + دکمه‌های مسیریابی؛ نشانگر «ردیابی فعال» |
| StageBar | stages[{label,state: done/cur/todo}] | ۴ مرحله‌ی تحویل |
| PlaceCard | title, kind, address, extra, canCall, onCall, onCopy | رستوران/مشتری |
| ItemCheckRow | item{q,name,opt,checked}, onToggle | role=checkbox؛ تیک هر غذا هنگام تحویل‌گیری |
| CashPanel | due, value, error, onInput, onExact | دریافت نقد؛ مغایرت = هشدار نه مانع |
| TripSummary | earn, rows[{label,value}], onDone | خلاصه‌ی سفارش تحویل‌شده |
| HistoryRow | order{title,sub,earn,pay}, onTap | ردیف تاریخچه |
| EarnBalance | balance, cash, dokoon, note | مانده، نقد در دست پیک، طلب از دکون (اعداد نمونه تا قانون تسویه) |
| DocStatusRow | doc{label,sub,status: ok/wait/bad,statusLabel,canRenew}, onRenew | وضعیت مدرک |
| PermissionCard | perm{title,text,d,granted,cta}, onGrant | مجوزهای دستگاه |

## مشترک با رستوران (از پکیج مشترک)
TopBar, ListRow, InfoList, EmptyState, ErrorPage, ErrorState, ToggleRow, FaqItem, ContactRow, ActionBar, FilterChip, SegTabs, RBottomNav (items/active/rail/onPick), TextField, WizardBar, ConfirmDialog, Toast, UploadTile, ReasonSheet, StatCard, BarChart.

## الگوهای مشترک
Overlay: `sheet` (ReasonSheet)، `dlg` (ConfirmDialog)، `alr` (OfferAlert)، Toast. ناوبری stack با «برگشت دقیق». حالت‌ها: ready/loading/error + آفلاین سراسری.
