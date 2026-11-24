import { useState } from 'react';
import { TextField } from '@/components/base/TextField';
import { FilterChip } from '@/components/library/FilterChip';
import { ToggleRow } from '@/components/library/ToggleRow';
import { discountBadge, discountPercent, endsText } from '@/lib/discount';
import { formatMoney, formatNumber, toFaDigits } from '@/lib/format';
import { calendarMonths } from '@/lib/jalali';
import { JalaliDatePicker } from '../../components/JalaliDatePicker';
import {
  chipPrice,
  DISCOUNT_CHIPS,
  DISCOUNT_LABELS,
  discountCheck,
  parseToman,
  type DishDraft,
  type DishErrors,
  type DiscountDurationPick,
} from '../../state/dish';
import s from './menu.module.css';

/** «تاریخ دلخواه» can end a discount up to 90 days ahead. */
const PICK_DAYS = 90;

const DURATIONS: readonly { pick: DiscountDurationPick; text: string }[] = [
  { pick: 'none', text: 'بدون پایان' },
  { pick: 'today', text: 'تا پایان امروز' },
  { pick: '3d', text: '۳ روز' },
  { pick: '7d', text: '۷ روز' },
  { pick: 'date', text: 'تاریخ دلخواه' },
];

export interface DiscountSectionProps {
  draft: DishDraft;
  errors: DishErrors;
  /** Show errors that wait for the first «ذخیره». */
  touched: boolean;
  patch: (p: Partial<DishDraft>) => void;
}

/**
 * «تخفیف ویژه» of the dish editor (D-131, KAN-109): the restaurant writes the new price (or taps a % chip),
 * sees a live preview, picks «تخفیف ویژه» / «جشنواره» and how long it runs. Starts immediately.
 */
export function DiscountSection({ draft, errors, touched, patch }: DiscountSectionProps) {
  const [months] = useState(() => calendarMonths(Date.now(), PICK_DAYS));
  const check = discountCheck(draft);
  const base = parseToman(draft.price) ?? 0;
  const price = parseToman(draft.discountPrice) ?? 0;
  // A discounted price that was typed is checked live (also when the base price changes).
  const priceError = draft.discountPrice || touched ? errors.discountPrice : undefined;
  const keepText = draft.discount?.endsAt ? endsText(draft.discount.endsAt) : '';
  const durations = keepText
    ? [{ pick: 'keep' as const, text: `پایان فعلی (${keepText})` }, ...DURATIONS]
    : DURATIONS;

  return (
    <section className={s.section} aria-labelledby="dish-discount">
      <h2 id="dish-discount" className={s.sh}>
        تخفیف ویژه
      </h2>
      <ToggleRow
        title="تخفیف روی این غذا"
        sub="قیمت قبلی برای مشتری خط می‌خورد و نشان درصد تخفیف دیده می‌شود"
        on={draft.discountOn}
        onFlip={() => patch({ discountOn: !draft.discountOn })}
      />
      {draft.discountOn ? (
        <div className={s.disc}>
          <TextField
            label="قیمت با تخفیف"
            value={draft.discountPrice}
            numeric
            maxDigits={9}
            suffix="تومان"
            hint={base ? `قیمت اصلی ${formatMoney(base)}` : 'اول قیمت اصلی را بنویسید'}
            error={priceError}
            onChange={(v) => patch({ discountPrice: v })}
          />
          <div className={s.chips} role="group" aria-label="درصد آماده">
            {DISCOUNT_CHIPS.map((pct) => {
              const p = chipPrice(draft, pct);
              return (
                <FilterChip
                  key={pct}
                  label={`${toFaDigits(pct)}٪`}
                  selected={!!p && p === draft.discountPrice}
                  onPick={() => p && patch({ discountPrice: p })}
                />
              );
            })}
          </div>
          {check && !check.error ? (
            <p className={s.preview} aria-live="polite">
              <s aria-label={`قیمت قبلی ${formatNumber(base)}`}>{formatNumber(base)}</s>
              <b>{formatMoney(price)}</b>
              <span className={s.tag}>
                {discountBadge(discountPercent(base, price), draft.discountLabel)}
              </span>
            </p>
          ) : null}

          <h3 id="dish-disc-label" className={s.sub}>
            عنوان
          </h3>
          <div className={s.chips} role="radiogroup" aria-labelledby="dish-disc-label">
            {DISCOUNT_LABELS.map((l) => (
              <FilterChip
                key={l.label}
                label={l.text}
                selected={draft.discountLabel === l.label}
                onPick={() => patch({ discountLabel: l.label })}
              />
            ))}
          </div>

          <h3 id="dish-disc-dur" className={s.sub}>
            مدت
          </h3>
          <div className={s.chips} role="radiogroup" aria-labelledby="dish-disc-dur">
            {durations.map((d) => (
              <FilterChip
                key={d.pick}
                label={d.text}
                selected={draft.discountDuration === d.pick}
                onPick={() => patch({ discountDuration: d.pick })}
              />
            ))}
          </div>
          {draft.discountDuration === 'date' ? (
            <>
              <JalaliDatePicker
                months={months}
                value={draft.discountDay}
                label="روز پایان تخفیف"
                onPick={(day) => patch({ discountDay: day })}
              />
              {touched && errors.discountDay ? <p className={s.err}>{errors.discountDay}</p> : null}
            </>
          ) : null}
          <p className={s.note}>
            تخفیف از همین حالا شروع می‌شود و در زمان پایان خودکار برداشته می‌شود. فقط قیمت خود غذا تخفیف
            می‌خورد، نه گزینه‌ها و افزودنی‌ها.
          </p>
        </div>
      ) : null}
    </section>
  );
}
