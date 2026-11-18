import { useEffect } from 'react';
import { api } from '@/api/client';
import { displayName, openGuarded } from '@/auth/flow';
import { useSession } from '@/auth/session';
import { Button } from '@/components/base/Button';
import { MenuList, type MenuItemVM } from '@/components/library/MenuList';
import { TopBar } from '@/components/library/TopBar';
import { ICONS } from '@/components/primitives/Icon';
import { formatPhone, greeting, toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from './registry';
import s from './account/account.module.css';

const LOGOUT = 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10';
const BELL = 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0';
const SETTINGS =
  'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4';

/**
 * Account tab (screen-specs §6): profile + menu. Guests see a login button; personal items are
 * guarded (login first, then the target). Badges are refreshed from GET /me whenever the tab is shown.
 */
export function AccountScreen({ route }: ScreenProps) {
  const { push, openOverlay } = useNav.getState();
  const user = useSession((st) => st.user);
  const loggedIn = useSession((st) => !!st.accessToken);
  const onTop = useNav((n) => n.stack.at(-1)?.key === route.key);

  useEffect(() => {
    if (!loggedIn || !onTop) return;
    let alive = true;
    api
      .GET('/me')
      .then(({ data }) => alive && data && useSession.getState().setUser(data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [loggedIn, onTop]);

  const badge = (n?: number) => (loggedIn && n ? toFaDigits(n) : undefined);
  const items: MenuItemVM[] = [
    {
      id: 'orders',
      label: 'سفارش‌ها',
      d: ICONS.bag,
      badge: badge(user?.activeOrders),
      onPick: () => openGuarded('orders'),
    },
    { id: 'favs', label: 'علاقه‌مندی‌ها', d: ICONS.heart, onPick: () => openGuarded('favs') },
    { id: 'addresses', label: 'آدرس‌های من', d: ICONS.pin, onPick: () => openGuarded('addresses') },
    {
      id: 'notifs',
      label: 'اعلان‌ها',
      d: BELL,
      badge: badge(user?.unreadNotifications),
      onPick: () => openGuarded('notifs'),
    },
    { id: 'promos', label: 'کدهای تخفیف', d: ICONS.tag, onPick: () => openGuarded('promos') },
  ];
  const general: MenuItemVM[] = [
    { id: 'settings', label: 'تنظیمات', d: SETTINGS, onPick: () => push('settings') },
    { id: 'about', label: 'درباره ما و قوانین', d: ICONS.info, onPick: () => push('about') },
  ];

  return (
    <div className={s.pageNav}>
      <TopBar title="حساب کاربری" />
      <div className={s.body}>
        <section className={s.profile} aria-label="پروفایل">
          <span className={s.avatar} aria-hidden="true">
            {displayName(loggedIn ? user?.name : null).slice(0, 1)}
          </span>
          <div className={s.profileText}>
            <b>{greeting(displayName(loggedIn ? user?.name : null))}</b>
            <small>{loggedIn && user?.phone ? formatPhone(user.phone) : 'برای ثبت سفارش وارد شوید'}</small>
          </div>
          {loggedIn ? (
            <button type="button" className={s.edit} onClick={() => push('editprof')}>
              ویرایش پروفایل
            </button>
          ) : null}
        </section>
        {!loggedIn ? (
          <Button size="lg" block onClick={() => push('login')}>
            ورود یا ثبت‌نام
          </Button>
        ) : null}
        <MenuList
          groups={[
            { id: 'main', items },
            { id: 'general', items: general },
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
