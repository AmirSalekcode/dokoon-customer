import type { ReactNode } from 'react';
import { Sheet, SheetHandle } from '@/components/base/Sheet';
import { Icon } from '@/components/primitives/Icon';
import s from './OrderSheets.module.css';

function SheetHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className={s.hd}>
      <h2>{title}</h2>
      <button type="button" className={s.x} aria-label="بستن" onClick={onClose}>
        <Icon name="close" />
      </button>
    </div>
  );
}

function Confirm({
  label,
  disabled,
  busy,
  danger,
  onClick,
}: {
  label: string;
  disabled: boolean;
  busy?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[s.ok, danger && s.danger].filter(Boolean).join(' ')}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={onClick}
    >
      {busy ? <i className={s.spin} aria-hidden="true" /> : null}
      {label}
    </button>
  );
}

export interface PrepOption {
  key: string;
  /** «۲۰» or «دلخواه» */
  big: string;
  small: string;
  on: boolean;
}

export interface PrepSheetProps {
  opts: PrepOption[];
  /** «دلخواه» picked: show the ±5 stepper. */
  custom: boolean;
  /** «۴۵ دقیقه» */
  customVal: string;
  canDec: boolean;
  canInc: boolean;
  /** What the customer is told (D-93). */
  preview: string;
  canConfirm: boolean;
  busy?: boolean;
  onPick: (key: string) => void;
  onStep: (delta: 5 | -5) => void;
  onConfirm: () => void;
  onClose: () => void;
}

/** Preparation time before accepting (restaurant component library). */
export function PrepSheet(p: PrepSheetProps) {
  return (
    <Sheet label="زمان آماده‌سازی" onClose={p.onClose}>
      <SheetHandle />
      <SheetHead title="زمان آماده‌سازی سفارش" onClose={p.onClose} />
      <div className={s.body}>
        <p className={s.p}>
          این زمان به مشتری نمایش داده می‌شود. هر وقت لازم شد می‌توانید زمان را افزایش دهید.
        </p>
        <div className={s.grid} role="group" aria-label="زمان آماده‌سازی">
          {p.opts.map((o) => (
            <button
              key={o.key}
              type="button"
              className={[s.opt, o.on && s.on, o.key === 'custom' && s.word].filter(Boolean).join(' ')}
              aria-pressed={o.on}
              onClick={() => p.onPick(o.key)}
            >
              <b>{o.big}</b>
              <span>{o.small}</span>
            </button>
          ))}
        </div>
        {p.custom ? (
          <div className={s.step}>
            <button
              type="button"
              aria-label="افزودن پنج دقیقه"
              disabled={!p.canInc}
              onClick={() => p.onStep(5)}
            >
              <Icon name="plus" />
            </button>
            <output aria-live="polite">{p.customVal}</output>
            <button
              type="button"
              aria-label="کم کردن پنج دقیقه"
              disabled={!p.canDec}
              onClick={() => p.onStep(-5)}
            >
              <Icon name="minus" />
            </button>
          </div>
        ) : null}
        <div className={s.preview}>
          <small>به مشتری اعلام می‌شود</small>
          <b>{p.preview}</b>
        </div>
        <Confirm label="تأیید و پذیرش سفارش" disabled={!p.canConfirm} busy={p.busy} onClick={p.onConfirm} />
      </div>
    </Sheet>
  );
}

export interface ReasonSheetProps {
  title: string;
  text: string;
  items: { id: string; label: string; on: boolean }[];
  confirmLabel: string;
  canConfirm: boolean;
  busy?: boolean;
  /** Loading / error content instead of the list. */
  status?: ReactNode;
  onPick: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

/** Reject / cancel reason (restaurant component library). */
export function ReasonSheet(p: ReasonSheetProps) {
  return (
    <Sheet label={p.title} onClose={p.onClose}>
      <SheetHandle />
      <SheetHead title={p.title} onClose={p.onClose} />
      <div className={s.body}>
        <p className={s.p}>{p.text}</p>
        {p.status ?? (
          <div className={s.reasons} role="radiogroup" aria-label={p.title}>
            {p.items.map((x) => (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={x.on}
                className={[s.reason, x.on && s.on].filter(Boolean).join(' ')}
                onClick={() => p.onPick(x.id)}
              >
                <span className={s.mark} aria-hidden="true" />
                {x.label}
              </button>
            ))}
          </div>
        )}
        <Confirm label={p.confirmLabel} disabled={!p.canConfirm} busy={p.busy} danger onClick={p.onConfirm} />
      </div>
    </Sheet>
  );
}
