import { useEffect } from 'react';
import { cartCount, useCart } from '@/cart/cart';
import { ToastHost } from '@/components/base/Toast';
import { BottomNav } from '@/components/library/BottomNav';
import { ArtSprite } from '@/components/primitives/ArtSprite';
import { toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import { initConnectivity, initSystemBack } from '@/nav/systemBack';
import { TABS, type TabId } from '@/nav/types';
import { OverlayHost } from './OverlayHost';
import { ScreenHost } from './ScreenHost';
import s from './app.module.css';

export function App() {
  const top = useNav((st) => st.stack[st.stack.length - 1]);
  const stackLen = useNav((st) => st.stack.length);
  const resetTo = useNav((st) => st.resetTo);
  const count = useCart(cartCount);

  useEffect(() => {
    const a = initSystemBack();
    const b = initConnectivity();
    return () => {
      a();
      b();
    };
  }, []);

  const showNav = stackLen === 1 && (TABS as string[]).includes(top.screen);

  return (
    <div className="app-frame" lang="fa" dir="rtl">
      <ArtSprite />
      <ScreenHost />
      {showNav ? (
        <div className={s.nav}>
          <BottomNav
            active={top.screen as TabId}
            cartBadge={count ? toFaDigits(count) : undefined}
            onPick={(t) => resetTo(t)}
          />
        </div>
      ) : null}
      <OverlayHost />
      <ToastHost />
    </div>
  );
}
