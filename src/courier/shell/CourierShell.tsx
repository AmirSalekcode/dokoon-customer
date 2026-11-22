import { useEffect, useRef } from 'react';
import { ToastHost } from '@/components/base/Toast';
import { RBottomNav, type RNavItem } from '@/components/library/RBottomNav';
import { ArtSprite } from '@/components/primitives/ArtSprite';
import { greeting } from '@/lib/format';
import { initConnectivity, initSystemBack } from '@/nav/systemBack';
import { useCourierSession } from '../api/session';
import { CHeader } from '../components/CHeader';
import { isCourierTab, useCourierNav, type CourierTab } from '../nav/nav';
import { courierScreenFor, SHELL_SCREENS } from '../screens/registry';
import { CourierOverlayHost } from './overlays';
import s from './CourierShell.module.css';

/** Tab icons from the prototype (App.dc.html `navD`). */
const NAV: RNavItem<CourierTab>[] = [
  {
    key: 'orders',
    label: 'سفارش‌ها',
    d: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  },
  {
    key: 'earn',
    label: 'درآمد',
    d: 'M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12M16 14h2',
  },
  { key: 'account', label: 'حساب', d: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0' },
];

/** Renders the stack; lower screens stay mounted (hidden + inert) so back returns exactly, scroll included. */
function CourierScreenHost() {
  const stack = useCourierNav((st) => st.stack);
  const topKey = stack[stack.length - 1]?.key;
  const lastTop = useRef(topKey);
  useEffect(() => {
    if (lastTop.current === topKey) return;
    lastTop.current = topKey;
    document.querySelector<HTMLElement>(`[data-route-key="${topKey}"]`)?.focus({ preventScroll: true });
  }, [topKey]);
  return (
    <>
      {stack.map((r) => {
        const Screen = courierScreenFor(r.screen);
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

/**
 * Courier app shell (KAN-89): three tabs (bottom bar < 720, side rail ≥ 720), stack navigation with exact
 * back (Android back, «press again to exit»), one overlay at a time, toasts, global offline page, theme.
 * The orange header sits on the orders tab with the greeting «سلام (name) عزیز»; earnings join it in KAN-98.
 */
export function CourierShell() {
  const top = useCourierNav((st) => st.stack[st.stack.length - 1]);
  const stackLen = useCourierNav((st) => st.stack.length);
  const resetTo = useCourierNav((st) => st.resetTo);
  const name = useCourierSession((st) => st.name);

  useEffect(() => {
    const stopBack = initSystemBack(useCourierNav);
    const stopNet = initConnectivity(useCourierNav);
    return () => {
      stopBack();
      stopNet();
    };
  }, []);

  const onShell = stackLen === 1 && SHELL_SCREENS.includes(top.screen);

  return (
    <div className={s.frame} lang="fa" dir="rtl">
      <ArtSprite />
      {onShell ? (
        <div className={s.rail}>
          <RBottomNav
            label="بخش‌های پیک"
            items={NAV}
            active={isCourierTab(top.screen) ? top.screen : 'orders'}
            onPick={(k) => resetTo(k)}
          />
        </div>
      ) : null}
      <div className={s.body}>
        {onShell && top.screen === 'orders' ? <CHeader who={name ? greeting(name) : 'دکون پیک'} /> : null}
        <div className={s.stage}>
          <CourierScreenHost />
        </div>
      </div>
      <CourierOverlayHost />
      <ToastHost />
    </div>
  );
}
