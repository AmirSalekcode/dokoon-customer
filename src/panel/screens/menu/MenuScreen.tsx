import { useEffect, useState } from 'react';
import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { SegTabs } from '@/components/library/SegTabs';
import { formatMoney, formatNumber, toFaDigits } from '@/lib/format';
import { MenuItemRow } from '../../components/MenuItemRow';
import { usePanelNav } from '../../nav/nav';
import { foodArt, foodsIn, useMenu } from '../../state/menu';
import s from './menu.module.css';

/**
 * Menu tab (KAN-66): category tabs (+ «همه»), «افزودن غذا», «مدیریت دسته‌ها» and the dishes with an
 * instant availability switch (optimistic, rolled back with a toast on failure).
 */
export function MenuScreen() {
  const categories = useMenu((st) => st.categories);
  const foods = useMenu((st) => st.foods);
  const status = useMenu((st) => st.status);
  const busy = useMenu((st) => st.busy);
  const [cat, setCat] = useState('all');

  useEffect(() => {
    if (useMenu.getState().status !== 'loading') void useMenu.getState().load();
  }, []);
  // A deleted category falls back to «همه».
  const active = cat === 'all' || categories.some((c) => c.id === cat) ? cat : 'all';
  const list = foodsIn(foods, active);
  const { push } = usePanelNav.getState();

  const tabs = [
    { key: 'all', label: 'همه', count: foods.length ? toFaDigits(foods.length) : '' },
    ...categories.map((c) => {
      const n = foodsIn(foods, c.id ?? '').length;
      return { key: c.id ?? '', label: c.label ?? '', count: n ? toFaDigits(n) : '' };
    }),
  ];
  const hasData = foods.length > 0 || categories.length > 0;

  let content;
  if (!hasData && (status === 'idle' || status === 'loading'))
    content = <LoadingState variant="list" rows={4} />;
  else if (!hasData && status === 'error')
    content = <ErrorState text="منو دریافت نشد." onRetry={() => void useMenu.getState().load()} />;
  else if (!list.length)
    content =
      active === 'all' ? (
        <EmptyState
          art="dk-all"
          title="منو هنوز خالی است"
          text="با دکمه‌ی «افزودن غذا» اولین غذا را اضافه کنید."
        />
      ) : (
        <EmptyState
          art="dk-all"
          title="غذایی در این دسته نیست"
          text="با دکمه‌ی بالا اولین غذا را اضافه کنید."
        />
      );
  else
    content = (
      <ul className={s.list} aria-label="غذاهای منو">
        {list.map((f) => (
          <li key={f.id}>
            <MenuItemRow
              item={{
                name: f.name ?? '',
                price: formatMoney(f.price ?? 0),
                old: f.oldPrice ? formatNumber(f.oldPrice) : undefined,
                art: foodArt(f),
                available: f.available !== false,
              }}
              busy={!!busy[f.id ?? '']}
              onToggle={() => void useMenu.getState().setAvailable(f.id!, f.available === false)}
              onEdit={() => push('dish', { id: f.id! })}
            />
          </li>
        ))}
      </ul>
    );

  return (
    <div className={s.page}>
      {categories.length ? (
        <div className={s.tabs}>
          <SegTabs label="دسته‌های منو" items={tabs} active={active} onPick={setCat} />
        </div>
      ) : null}
      <div className={s.actions}>
        <Button
          onClick={() => push('dish', active === 'all' ? {} : { cat: active })}
          disabled={!hasData || !categories.length}
        >
          افزودن غذا
        </Button>
        <Button variant="secondary" onClick={() => push('cats')} disabled={!hasData && status !== 'ready'}>
          مدیریت دسته‌ها
        </Button>
      </div>
      {status === 'ready' && !categories.length ? (
        <p className={s.note}>برای افزودن غذا، اول از «مدیریت دسته‌ها» یک دسته بسازید.</p>
      ) : null}
      {content}
    </div>
  );
}
