import { useSession } from '@/auth/session';
import { MenuList } from '@/components/library/MenuList';
import { TopBar } from '@/components/library/TopBar';
import { ICONS } from '@/components/primitives/Icon';
import { useNav } from '@/nav/nav';
import { toFaDigits } from '@/lib/format';
import s from './screens.module.css';

/** Account tab (foundation): menu entries + link to the foundation lab (settings). */
export function AccountScreen() {
  const push = useNav((st) => st.push);
  const openOverlay = useNav((st) => st.openOverlay);
  const active = useSession((st) => st.user?.activeOrders) ?? 1;
  return (
    <div className={s.page}>
      <TopBar title="حساب کاربری" />
      <div className={s.pad}>
        <MenuList
          groups={[
            {
              id: 'main',
              items: [
                {
                  id: 'orders',
                  label: 'سفارش‌ها',
                  d: ICONS.bag,
                  badge: active ? toFaDigits(active) : undefined,
                  onPick: () => push('orders'),
                },
                { id: 'favs', label: 'علاقه‌مندی‌ها', d: ICONS.heart, onPick: () => push('favs') },
                { id: 'addresses', label: 'آدرس‌های من', d: ICONS.pin, onPick: () => push('addresses') },
                {
                  id: 'settings',
                  label: 'تنظیمات (آزمایشگاه پایه)',
                  d: ICONS.filter,
                  onPick: () => push('settings'),
                },
              ],
            },
            {
              id: 'out',
              items: [
                {
                  id: 'logout',
                  label: 'خروج از حساب',
                  d: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10',
                  out: true,
                  onPick: () => openOverlay({ kind: 'dlg', props: { action: 'logout' } }),
                },
              ],
            },
          ]}
        />
      </div>
    </div>
  );
}
