import { useEffect, useRef, useState } from 'react';
import { ToggleRow } from '@/components/library/ToggleRow';
import { TopBar } from '@/components/library/TopBar';
import { toast } from '@/ui/toast';
import { SoundPanel } from '../components/SoundPanel';
import { usePanelNav } from '../nav/nav';
import { PANEL_TOAST_MS } from '../shell/openSwitch';
import { soundEngine } from '../sound/engine';
import { useSoundSettings } from '../sound/settings';
import { wakeLock } from '../sound/wakeLock';
import s from './screens.module.css';

/** iPhone / iPad (also iPadOS that reports itself as a Mac with touch). */
const isIos = () =>
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

/**
 * «صدا و هشدار» (KAN-61, restaurant screen specs §5 `sound`): test the alert at 5 levels, repeat until
 * answered, vibration, and the honest platform notes (iOS, screen lock).
 */
export function SoundScreen() {
  const { level, repeat, vibrate, set } = useSoundSettings();
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      soundEngine().stopPreview();
    },
    [],
  );

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    soundEngine().stopPreview();
    setPlaying(false);
  };

  const play = async () => {
    if (playing) return stop();
    setPlaying(true);
    const ms = await soundEngine().preview();
    if (!ms) {
      setPlaying(false);
      toast('مرورگر اجازه‌ی پخش صدا نداد؛ صدای گوشی را بررسی کنید', 'warn', PANEL_TOAST_MS);
      return;
    }
    timer.current = setTimeout(() => setPlaying(false), ms);
  };

  const canVibrate = typeof navigator.vibrate === 'function';
  return (
    <>
      <TopBar title="صدا و هشدار" level={1} onBack={() => usePanelNav.getState().back()} />
      <div className={s.page}>
        <SoundPanel
          playing={playing}
          level={level}
          tone="زنگ سفارش جدید · تا زمان پاسخ تکرار می‌شود"
          onPlay={() => void play()}
          onLevel={(n) => {
            set({ level: n });
            soundEngine().applyLevel();
          }}
        />
        <div className={s.card}>
          <ToggleRow
            title="تکرار صدا تا پاسخ"
            sub="تا وقتی سفارش جدید را نپذیرید یا رد نکنید"
            on={repeat}
            onFlip={() => set({ repeat: !repeat })}
          />
          <ToggleRow
            title="لرزش"
            sub={canVibrate ? 'همراه با هر زنگ' : 'این دستگاه یا مرورگر لرزش را پشتیبانی نمی‌کند'}
            on={vibrate && canVibrate}
            disabled={!canVibrate}
            onFlip={() => set({ vibrate: !vibrate })}
          />
        </div>
        {!wakeLock().supported ? (
          <p className={s.warn} role="note">
            این مرورگر نمی‌تواند صفحه را روشن نگه دارد؛ در تنظیمات گوشی، خاموش‌شدن خودکار صفحه را غیرفعال
            کنید.
          </p>
        ) : null}
        <p className={[s.warn, isIos() && s.strong].filter(Boolean).join(' ')} role="note">
          روی آیفون، صدا و هشدار بلند فقط وقتی برنامه باز است قابل اطمینان است. برای رستوران‌های شلوغ، گوشی یا
          تبلت اندروید پیشنهاد می‌شود.
        </p>
      </div>
    </>
  );
}
