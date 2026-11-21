import { useEffect, useState } from 'react';
import { ActionBar } from '@/components/library/ActionBar';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { ToggleRow } from '@/components/library/ToggleRow';
import { TopBar } from '@/components/library/TopBar';
import { toFaDigits } from '@/lib/format';
import { toast } from '@/ui/toast';
import type { RestaurantSettings } from '../../api/types';
import { usePanelNav } from '../../nav/nav';
import { PANEL_TOAST_MS } from '../../shell/openSwitch';
import { ETA_MAX, ETA_MIN, stepEta, useSettings } from '../../state/settings';
import s from './account.module.css';

function Stepper({
  label,
  value,
  onUp,
  onDown,
  upOff,
  downOff,
}: {
  label: string;
  value: number;
  onUp: () => void;
  onDown: () => void;
  upOff: boolean;
  downOff: boolean;
}) {
  return (
    <div className={s.stepper}>
      <span>{label}</span>
      <button type="button" aria-label={`افزایش ${label}`} disabled={upOff} onClick={onUp}>
        +
      </button>
      <output aria-label={label} aria-live="polite">
        {toFaDigits(value)} دقیقه
      </output>
      <button type="button" aria-label={`کاهش ${label}`} disabled={downOff} onClick={onDown}>
        −
      </button>
    </div>
  );
}

/**
 * Delivery & payment (KAN-69): cash on delivery, extras (option groups) for the whole restaurant, and the
 * default prep range (5..120, step 5, max ≥ min). The exact time of each order is set when accepting it.
 */
export function DeliveryScreen() {
  const saved = useSettings((st) => st.settings);
  const status = useSettings((st) => st.status);
  // Edits live in `draft`; until the first edit the form shows the server's settings.
  const [draft, setCfg] = useState<RestaurantSettings | null>(null);
  const cfg = draft ?? saved;
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void useSettings.getState().load();
  }, []);

  const nav = usePanelNav.getState;
  const dirty =
    !!cfg &&
    !!saved &&
    (['allowCash', 'allowExtras', 'etaMin', 'etaMax'] as const).some((k) => cfg[k] !== saved[k]);
  const min = cfg?.etaMin ?? ETA_MIN;
  const max = cfg?.etaMax ?? min;
  const eta = (which: 'min' | 'max', dir: 1 | -1) =>
    cfg && setCfg({ ...cfg, ...stepEta(cfg.etaMin ?? ETA_MIN, cfg.etaMax ?? ETA_MIN, which, dir) });

  const save = async () => {
    if (!cfg || saving) return;
    setSaving(true);
    const msg = await useSettings.getState().save(cfg);
    setSaving(false);
    if (msg === null) {
      toast('تنظیمات ذخیره شد', 'success', PANEL_TOAST_MS);
      nav().back();
    } else toast(msg || 'تنظیمات ذخیره نشد؛ دوباره تلاش کنید', 'error', PANEL_TOAST_MS);
  };

  return (
    <div className={s.wrap}>
      <TopBar title="تنظیمات تحویل و پرداخت" onBack={() => nav().back()} />
      <div className={s.body}>
        {!cfg && status === 'error' ? (
          <ErrorState text="تنظیمات دریافت نشد." onRetry={() => void useSettings.getState().load()} />
        ) : null}
        {!cfg && status !== 'error' ? <LoadingState variant="list" rows={3} /> : null}
        {cfg ? (
          <>
            <ToggleRow
              title="پرداخت نقدی هنگام تحویل"
              sub="پیک مبلغ را از مشتری می‌گیرد"
              on={!!cfg.allowCash}
              onFlip={() => setCfg({ ...cfg, allowCash: !cfg.allowCash })}
            />
            <ToggleRow
              title="افزودنی و گزینه‌ها"
              sub="اگر خاموش باشد، مشتری گزینه‌ای برای غذاها نمی‌بیند"
              on={!!cfg.allowExtras}
              onFlip={() => setCfg({ ...cfg, allowExtras: !cfg.allowExtras })}
            />
            <h2 className={s.sh}>بازه‌ی پیش‌فرض آماده‌سازی</h2>
            <p className={s.note}>
              هنگام پذیرش هر سفارش می‌توانید زمان دقیق را تغییر دهید. مشتری فقط زمان تحویل را می‌بیند.
            </p>
            <Stepper
              label="حداقل زمان"
              value={min}
              onUp={() => eta('min', 1)}
              onDown={() => eta('min', -1)}
              upOff={min >= ETA_MAX}
              downOff={min <= ETA_MIN}
            />
            <Stepper
              label="حداکثر زمان"
              value={max}
              onUp={() => eta('max', 1)}
              onDown={() => eta('max', -1)}
              upOff={max >= ETA_MAX}
              downOff={max <= ETA_MIN}
            />
          </>
        ) : null}
      </div>
      <div className={s.dock}>
        <ActionBar label="ذخیره‌ی تنظیمات" disabled={!dirty || saving} onTap={() => void save()} />
      </div>
    </div>
  );
}
