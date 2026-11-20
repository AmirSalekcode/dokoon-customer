import { useEffect, useRef, useState } from 'react';
import { ToastHost } from '@/components/base/Toast';
import { ConfirmDialog } from '@/components/library/ConfirmDialog';
import { LoadingState } from '@/components/library/LoadingState';
import { ArtSprite } from '@/components/primitives/ArtSprite';
import { formatDecimal, formatNumber, toFaDigits } from '@/lib/format';
import { initConnectivity, initSystemBack } from '@/nav/systemBack';
import { checkPanelConfig } from '../api/appConfig';
import { panelApi } from '../api/client';
import { bootPanel, logout } from '../auth/flow';
import { isPanelTab, usePanelNav, type PanelTab } from '../nav/nav';
import { startAlerts } from '../orders/alerts';
import { AlertOverlay, PrepOverlay, ReasonOverlay } from '../orders/OrderOverlays';
import { PrintHost } from '../orders/print';
import { panelScreenFor, SHELL_SCREENS } from '../screens/registry';
import { reconnectLive, startLive, stopLive } from '../realtime/live';
import { useRestaurant } from '../state/restaurant';
import { useShift } from '../state/shift';
import { countByTab, useOrders } from '../state/orders';
import { confirmClose, toggleOpen } from './openSwitch';
import { RBottomNav, type RNavItem } from './RBottomNav';
import { RHeader } from './RHeader';
import s from './PanelShell.module.css';

const NAV: RNavItem<PanelTab>[] = [
  {
    key: 'orders',
    label: 'سفارش‌ها',
    d: 'M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1zM9 8h6M9 12h6',
  },
  { key: 'menu', label: 'منو', d: 'M5 4v7a3 3 0 0 0 3 3v6M8 4v6M11 4v7a3 3 0 0 1-3 3M17 4c-2 1-3 4-3 7h3v9' },
  { key: 'reports', label: 'گزارش', d: 'M5 20V11M12 20V5M19 20v-7' },
  { key: 'account', label: 'حساب', d: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0' },
];

/** The config check never holds the panel longer than this (a slow server must not block orders). */
const CONFIG_WAIT_MS = 3000;

/** Renders the stack; lower screens stay mounted (hidden + inert) so back returns exactly. */
function PanelScreenHost() {
  const stack = usePanelNav((st) => st.stack);
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
        const Screen = panelScreenFor(r.screen);
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

function PanelOverlayHost() {
  const overlay = usePanelNav((st) => st.overlay);
  const closeOverlay = usePanelNav((st) => st.closeOverlay);
  if (overlay?.kind === 'alert') return <AlertOverlay />;
  if (overlay?.kind === 'prep' && typeof overlay.props?.id === 'string')
    return <PrepOverlay key={overlay.props.id} id={overlay.props.id} />;
  if (overlay?.kind === 'reason' && typeof overlay.props?.id === 'string')
    return <ReasonOverlay key={overlay.props.id} id={overlay.props.id} />;
  if (overlay?.kind !== 'confirm') return null;
  if (overlay.props?.action === 'logout')
    return (
      <ConfirmDialog
        title="از حساب خارج می‌شوید؟"
        text="تا ورود دوباره، روی این دستگاه سفارش جدید دریافت نمی‌کنید. دستگاه‌های دیگر وارد می‌مانند."
        confirmLabel="خروج"
        tone="danger"
        onConfirm={() => {
          closeOverlay();
          void logout();
        }}
        onCancel={closeOverlay}
      />
    );
  return (
    <ConfirmDialog
      title="رستوران بسته شود؟"
      text="تا وقتی دوباره باز کنید، سفارش جدید دریافت نمی‌کنید. ساعت کاری هفتگی تغییر نمی‌کند."
      confirmLabel="بستن رستوران"
      tone="danger"
      onConfirm={() => void confirmClose()}
      onCancel={closeOverlay}
    />
  );
}

/**
 * Restaurant app shell (KAN-58): business header + 4-tab navigation (bottom bar < 720, side rail ≥ 720),
 * stack with exact back (Android back, «press again to exit»), open/closed switch, full-page errors,
 * startup `GET /app/config` (maintenance / forced update).
 */
export function PanelShell() {
  const top = usePanelNav((st) => st.stack[st.stack.length - 1]);
  const stackLen = usePanelNav((st) => st.stack.length);
  const resetTo = usePanelNav((st) => st.resetTo);
  const profile = useRestaurant((st) => st.profile);
  const switching = useRestaurant((st) => st.switching);
  const [booted, setBooted] = useState(false);
  const shiftOn = useShift((st) => st.started);
  const newCount = useOrders((st) => countByTab(st.byId).new);
  // Badge on the orders tab = number of new orders (screen specs §2).
  const navItems = NAV.map((it) =>
    it.key === 'orders' && newCount
      ? { ...it, badge: toFaDigits(newCount), badgeLabel: `${toFaDigits(newCount)} سفارش جدید` }
      : it,
  );

  // Live orders while the shift is on (KAN-62); back online → reconnect without waiting for backoff.
  useEffect(() => {
    if (!shiftOn) return;
    startLive();
    const stopAlerts = startAlerts();
    window.addEventListener('online', reconnectLive);
    return () => {
      window.removeEventListener('online', reconnectLive);
      stopAlerts();
      stopLive();
    };
  }, [shiftOn]);

  useEffect(() => {
    const a = initSystemBack(usePanelNav);
    const b = initConnectivity(usePanelNav);
    return () => {
      a();
      b();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const wait = new Promise<null>((r) => setTimeout(() => r(null), CONFIG_WAIT_MS));
    void Promise.race([checkPanelConfig(panelApi(), __APP_VERSION__), wait]).then((block) => {
      if (!alive) return;
      if (block) usePanelNav.getState().resetTo('error', { kind: block });
      else bootPanel();
      setBooted(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const onShell = stackLen === 1 && SHELL_SCREENS.includes(top.screen);

  return (
    <div className={[s.frame, onShell && s.withNav].filter(Boolean).join(' ')} lang="fa" dir="rtl">
      <ArtSprite />
      {!booted ? (
        <div className={s.boot}>
          <LoadingState variant="list" rows={3} />
        </div>
      ) : (
        <>
          {onShell ? (
            <div className={s.rail}>
              <RBottomNav
                items={navItems}
                active={isPanelTab(top.screen) ? top.screen : 'orders'}
                onPick={(k) => resetTo(k)}
              />
            </div>
          ) : null}
          <div className={s.body}>
            {onShell && profile ? (
              <RHeader
                rest={profile.name ?? ''}
                sub={
                  profile.rating !== undefined
                    ? `امتیاز ${formatDecimal(profile.rating)} · ${formatNumber(profile.reviewCount ?? 0)} نظر`
                    : undefined
                }
                open={profile.open ?? true}
                busy={switching}
                onToggle={toggleOpen}
              />
            ) : null}
            <div className={s.stage}>
              <PanelScreenHost />
            </div>
          </div>
          <PanelOverlayHost />
        </>
      )}
      <ToastHost />
      <PrintHost />
    </div>
  );
}
