import { useEffect, useState } from 'react';
import { useNav } from '@/nav/nav';
import { ToggleRow } from '@/components/library/ToggleRow';
import { useConsent } from './consent';
import s from './CookieConsent.module.css';

/** Max wait for the web font before showing the popup anyway (slow or blocked font). */
export const FONT_WAIT_MS = 3000;

/** The weights the popup uses (body 400, title/buttons 700). */
const FONT_SPECS = ['400 14px "Yekan Bakh"', '700 16px "Yekan Bakh"'];

type FontSet = { load?: (spec: string) => Promise<unknown> } | undefined;
const fontSet = (): FontSet =>
  typeof document !== 'undefined' ? (document as { fonts?: FontSet }).fonts : undefined;

/**
 * True once the popup's web font is in place. The popup is anchored to the bottom, so rendering it
 * with the fallback font and swapping to Yekan Bakh later made it jump (CLS ≈ 0.06–0.08 on first visits).
 * Browsers load fonts lazily, so `document.fonts.ready` can resolve before anything started loading;
 * we request the faces explicitly instead. Appearing after the load causes no layout shift.
 */
function useFontsReady(): boolean {
  // Only skip waiting when the Font Loading API is missing. fonts.check() is not trusted: Chrome
  // returns true before a lazily-loaded face has arrived. load() resolves at once when cached.
  const [ready, setReady] = useState(() => !fontSet()?.load);
  useEffect(() => {
    if (ready) return;
    let alive = true;
    const done = () => alive && setReady(true);
    const timer = setTimeout(done, FONT_WAIT_MS);
    const f = fontSet();
    Promise.all(FONT_SPECS.map((spec) => f!.load!(spec))).then(done, done);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [ready]);
  return ready;
}

/**
 * Cookie consent popup (bottom card, non-blocking so the app stays usable).
 * Shown until the user decides; can be re-opened from settings via useConsent().reset().
 */
export function CookieConsent() {
  const { decided, acceptAll, essentialOnly, save } = useConsent();
  const push = useNav((st) => st.push);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const fontsReady = useFontsReady();
  if (decided || !fontsReady) return null;

  return (
    <div className={s.wrap} role="dialog" aria-modal="false" aria-label="رضایت استفاده از کوکی">
      <div className={s.card}>
        <h2 id="cc-title" className={s.title}>
          کوکی‌ها و حریم خصوصی
        </h2>
        <p className={s.text}>
          دکون برای کارکرد اپ (ورود، سبد خرید، تم) اطلاعات ضروری را روی دستگاه شما نگه می‌دارد. با اجازه‌ی شما
          از آمار ناشناس هم برای بهتر کردن اپ استفاده می‌کنیم.{' '}
          <button type="button" className={s.link} onClick={() => push('legal', { kind: 'privacy' })}>
            سیاست حریم خصوصی
          </button>
        </p>

        {details ? (
          <div className={s.rows}>
            <ToggleRow title="کوکی‌های ضروری" sub="بدون این‌ها اپ کار نمی‌کند؛ همیشه فعال" on disabled />
            <ToggleRow
              title="آمار و بهبود اپ"
              sub="آمار ناشناس استفاده؛ پیش‌فرض خاموش"
              on={analytics}
              onFlip={() => setAnalytics((v) => !v)}
            />
            <button type="button" className={s.primary} onClick={() => save({ analytics })}>
              ذخیره‌ی انتخاب‌ها
            </button>
          </div>
        ) : (
          <div className={s.actions}>
            <button type="button" className={s.primary} onClick={acceptAll}>
              پذیرفتن همه
            </button>
            <button type="button" className={s.secondary} onClick={essentialOnly}>
              فقط ضروری
            </button>
            <button type="button" className={s.ghost} onClick={() => setDetails(true)}>
              تنظیمات
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
