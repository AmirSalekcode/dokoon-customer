import { useEffect } from 'react';
import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/library/EmptyState';
import { LoadingState } from '@/components/library/LoadingState';
import { SelectCard } from '@/components/library/SelectCard';
import { TopBar } from '@/components/library/TopBar';
import { Icon, ICONS } from '@/components/primitives/Icon';
import { useAddresses } from '@/features/addresses';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import s from './account.module.css';

/** My addresses (screen-specs §6): list, add, delete (with confirmation). Tapping one makes it the default. */
export function AddressesScreen({ route }: ScreenProps) {
  const { back, push, openOverlay } = useNav.getState();
  const { list, loaded, selectedId, select } = useAddresses();
  const onTop = useNav((n) => n.stack.at(-1)?.key === route.key);

  useEffect(() => {
    if (onTop) void useAddresses.getState().load();
  }, [onTop]);

  const add = (
    <Button size="lg" block onClick={() => push('addaddr')}>
      افزودن آدرس جدید
    </Button>
  );

  return (
    <div className={s.pageDock}>
      <TopBar title="آدرس‌های من" onBack={() => back()} />
      {!loaded ? (
        <LoadingState variant="list" />
      ) : list.length === 0 ? (
        <EmptyState
          art="dk-mix"
          title="هنوز آدرسی ثبت نکرده‌اید"
          text="آدرس تحویل را یک‌بار ثبت کنید تا سفارش بعدی سریع‌تر شود."
          action={add}
        />
      ) : (
        <>
          <ul className={`${s.list} ${s.plain}`} aria-label="آدرس‌های من">
            {list.map((a) => (
              <li key={a.id} className={s.row}>
                <SelectCard
                  radio
                  title={a.title ?? ''}
                  sub={a.fullText}
                  icon={a.title === 'محل کار' ? ICONS.bag : ICONS.home}
                  selected={a.id === selectedId}
                  onPick={() => a.id && select(a.id)}
                />
                <button
                  type="button"
                  className={s.del}
                  aria-label={`حذف ${a.title ?? ''}`}
                  onClick={() =>
                    openOverlay({ kind: 'delconfirm', props: { addressId: a.id, title: a.title } })
                  }
                >
                  <Icon name="trash" />
                </button>
              </li>
            ))}
          </ul>
          <div className={s.dock}>{add}</div>
        </>
      )}
    </div>
  );
}
