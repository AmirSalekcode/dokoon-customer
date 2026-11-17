import { useEffect, useRef } from 'react';
import { useNav } from '@/nav/nav';
import { screenFor } from '@/screens/registry';
import s from './app.module.css';

/**
 * Renders the whole stack; only the top screen is visible. Lower screens stay mounted
 * (hidden + inert), so «back» returns to the exact previous screen with its state and scroll.
 */
export function ScreenHost() {
  const stack = useNav((st) => st.stack);
  const topKey = stack[stack.length - 1]?.key;
  const lastTop = useRef(topKey);

  useEffect(() => {
    if (lastTop.current === topKey) return;
    lastTop.current = topKey;
    // Move focus to the new screen for screen readers / keyboard users.
    const el = document.querySelector<HTMLElement>(`[data-route-key="${topKey}"]`);
    el?.focus({ preventScroll: true });
  }, [topKey]);

  return (
    <>
      {stack.map((r) => {
        const Screen = screenFor(r.screen);
        const isTop = r.key === topKey;
        return (
          <main
            key={r.key}
            className={s.screen}
            data-route-key={r.key}
            data-screen={r.screen}
            hidden={!isTop}
            inert={!isTop}
            tabIndex={-1}
          >
            <Screen route={r} />
          </main>
        );
      })}
    </>
  );
}
