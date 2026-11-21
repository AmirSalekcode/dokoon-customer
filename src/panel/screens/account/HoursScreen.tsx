import { useEffect, useState } from 'react';
import { ActionBar } from '@/components/library/ActionBar';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { toast } from '@/ui/toast';
import type { DayHours } from '../../api/types';
import { HoursRow } from '../../components/HoursRow';
import { usePanelNav } from '../../nav/nav';
import { PANEL_TOAST_MS } from '../../shell/openSwitch';
import { DAY_NAMES, dayError, FROM_TIMES, TO_TIMES, useHours } from '../../state/hours';
import s from './account.module.css';

/**
 * Weekly opening hours (KAN-69): 7 days, open switch + from/to every 30 minutes up to 02:00. Special days
 * and public holidays come later (D-101). The header's open/closed switch never changes these hours.
 */
export function HoursScreen() {
  const saved = useHours((st) => st.days);
  const status = useHours((st) => st.status);
  // Edits live in `draft`; until the first edit the form shows the server's week.
  const [draft, setDraft] = useState<DayHours[] | null>(null);
  const days = draft ?? saved;
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void useHours.getState().load();
  }, []);

  const nav = usePanelNav.getState;
  const dirty = !!days && JSON.stringify(days) !== JSON.stringify(saved);
  const hasError = !!days?.some((d) => dayError(d));
  const set = (day: number, p: Partial<DayHours>) =>
    days && setDraft(days.map((d) => (d.day === day ? { ...d, ...p } : d)));

  const save = async () => {
    if (!days || saving) return;
    setSaving(true);
    const msg = await useHours.getState().save(days);
    setSaving(false);
    if (msg === null) {
      toast('ساعت کاری ذخیره شد', 'success', PANEL_TOAST_MS);
      nav().back();
    } else toast(msg || 'ساعت کاری ذخیره نشد؛ دوباره تلاش کنید', 'error', PANEL_TOAST_MS);
  };

  return (
    <div className={s.wrap}>
      <TopBar title="ساعت کاری" onBack={() => nav().back()} />
      <div className={s.body}>
        <p className={s.note}>
          در ساعت‌های بسته، رستوران به مشتری «بسته» نمایش داده می‌شود. کلید باز/بسته‌ی بالای صفحه این برنامه
          را تغییر نمی‌دهد. تعطیلات رسمی و روزهای خاص به‌زودی اضافه می‌شود.
        </p>
        {!days && status === 'error' ? (
          <ErrorState text="ساعت کاری دریافت نشد." onRetry={() => void useHours.getState().load()} />
        ) : null}
        {!days && status !== 'error' ? <LoadingState variant="list" rows={4} /> : null}
        {days ? (
          <div className={s.days}>
            {days.map((d) => (
              <HoursRow
                key={d.day}
                day={DAY_NAMES[d.day] ?? ''}
                on={d.on}
                from={d.from ?? ''}
                to={d.to ?? ''}
                fromTimes={FROM_TIMES}
                toTimes={TO_TIMES}
                error={dayError(d)}
                onFlip={() => set(d.day, { on: !d.on })}
                onFrom={(v) => set(d.day, { from: v })}
                onTo={(v) => set(d.day, { to: v })}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className={s.dock}>
        <ActionBar
          label="ذخیره‌ی ساعت کاری"
          disabled={!dirty || hasError || saving}
          onTap={() => void save()}
        />
      </div>
    </div>
  );
}
