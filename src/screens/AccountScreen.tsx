import { displayName, openGuarded } from '@/auth/flow';
import { useSession } from '@/auth/session';
import { Button } from '@/components/base/Button';
import { MenuList } from '@/components/library/MenuList';
import { TopBar } from '@/components/library/TopBar';
import { ICONS } from '@/components/primitives/Icon';
import { formatPhone, greeting, toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import s from './screens.module.css';

const LOGOUT = 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10';

/** Account tab. Guests see a login card; personal items (orders, favorites, addresses) are guarded. */
export function AccountScreen() {
  const push = useNav((st) => st.push);
  const openOverlay = useNav((st) => st.openOverlay);
  const user = useSession((st) => st.user);
  const loggedIn = useSession((st) => !!st.accessToken);
  const active = user?.activeOrders ?? 0;

  return (
    <div className={s.page}>
      <TopBar title="حساب کاربری" />
      <div className={`${s.pad} ${s.stack}`}>
        <section className={s.profile} aria-label="پروفایل">
          <span className={s.avatar} aria-hidden="true">
            {displayName(user?.name).slice(0, 1)}
          </span>
          <div className={s.profileText}>
            <b>{greeting(displayName(loggedIn ? user?.name : null))}</b>
            <small>{loggedIn && user?.phone ? formatPhone(user.phone) : 'برای ثبت سفارش وارد شوید'}</small>
          </div>
        </section>
        {!loggedIn ? (
          <Button size="lg" block onClick={() => push('login')}>
            ورود یا ثبت‌نام
          </Button>
        ) : null}
        <MenuList
          groups={[
            {
              id: 'main',
              items: [
                {
                  id: 'orders',
                  label: 'سفارش‌ها',
                  d: ICONS.bag,
                  badge: loggedIn && active ? toFaDigits(active) : undefined,
                  onPick: () => openGuarded('orders'),
                },
                { id: 'favs', label: 'علاقه‌مندی‌ها', d: ICONS.heart, onPick: () => openGuarded('favs') },
                {
                  id: 'addresses',
                  label: 'آدرس‌های من',
                  d: ICONS.pin,
                  onPick: () => openGuarded('addresses'),
                },
                { id: 'settings', label: 'تنظیمات', d: ICONS.filter, onPick: () => push('settings') },
              ],
            },
            ...(loggedIn
              ? [
                  {
                    id: 'out',
                    items: [
                      {
                        id: 'logout',
                        label: 'خروج از حساب',
                        d: LOGOUT,
                        out: true,
                        onPick: () => openOverlay({ kind: 'dlg', props: { action: 'logout' } }),
                      },
                    ],
                  },
                ]
              : []),
          ]}
        />
      </div>
    </div>
  );
}
