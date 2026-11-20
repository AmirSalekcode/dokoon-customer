import { create } from 'zustand';
import { toast } from '@/ui/toast';
import { usePanelNav } from '../nav/nav';
import { PANEL_TOAST_MS } from '../shell/openSwitch';
import { soundEngine } from '../sound/engine';
import { wakeLock } from '../sound/wakeLock';

interface ShiftState {
  /**
   * The «شروع شیفت» tap happened in this page load. Browsers only allow sound after a user gesture,
   * so a reload always starts at the shift screen again (memory only, never persisted).
   */
  started: boolean;
  /** Sound could be unlocked (false: the browser refused audio). */
  soundOn: boolean;
  /** The screen is kept on (Screen Wake Lock), false when unsupported or refused. */
  screenOn: boolean;
  start: () => void;
  end: () => void;
}

export const useShift = create<ShiftState>((set) => ({
  started: false,
  soundOn: false,
  screenOn: false,
  start: () => set({ started: true }),
  end: () => set({ started: false, soundOn: false, screenOn: false }),
}));

export const SHIFT_STARTED = 'شیفت شروع شد؛ صدای هشدار فعال است';
export const SHIFT_NO_WAKE = 'شیفت شروع شد؛ خاموش‌شدن خودکار صفحه را در تنظیمات گوشی خاموش کنید';
export const SHIFT_NO_SOUND = 'مرورگر اجازه‌ی پخش صدا نداد؛ صدای گوشی و مرورگر را بررسی کنید';

/**
 * «شروع شیفت و فعال‌سازی صدا» (KAN-61): must run inside the tap (the AudioContext is created
 * synchronously there), plays the test sound, keeps the screen on, then opens the orders tab.
 */
export async function beginShift() {
  const unlocking = soundEngine().unlock();
  const locking = wakeLock().acquire();
  useShift.getState().start();
  usePanelNav.getState().resetTo('orders');
  const [soundOn, screenOn] = await Promise.all([unlocking, locking]);
  useShift.setState({ soundOn, screenOn });
  toast(
    !soundOn ? SHIFT_NO_SOUND : screenOn ? SHIFT_STARTED : SHIFT_NO_WAKE,
    soundOn ? 'info' : 'warn',
    PANEL_TOAST_MS * 2,
  );
}

/** Logout / session end: stop ringing and let the screen sleep again. */
export function endShift() {
  soundEngine().stopAlert();
  void wakeLock().release();
  useShift.getState().end();
}
