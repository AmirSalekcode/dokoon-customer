import { useEffect, useState } from 'react';

/** Current time, re-read every `ms` (relative times, answer deadlines). */
export function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Tablet/desktop layout (list + detail side by side), same breakpoint as the CSS (720px). */
export const WIDE_QUERY = '(min-width: 720px)';
const wideNow = () => typeof window !== 'undefined' && !!window.matchMedia?.(WIDE_QUERY).matches;

export function useWide(): boolean {
  const [wide, setWide] = useState(wideNow);
  useEffect(() => {
    const mq = window.matchMedia?.(WIDE_QUERY);
    if (!mq) return;
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}
