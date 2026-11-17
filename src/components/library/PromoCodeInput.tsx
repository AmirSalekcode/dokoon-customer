import { useId } from 'react';
import { normalizeDigits } from '@/lib/format';
import s from './PromoCodeInput.module.css';

export interface PromoCodeInputProps {
  value: string;
  status?: 'ok' | 'err' | '';
  message?: string;
  busy?: boolean;
  onInput?: (v: string) => void;
  onApply?: () => void;
}

/** Promo code field with ok/err state and message. */
export function PromoCodeInput({ value, status = '', message, busy, onInput, onApply }: PromoCodeInputProps) {
  const id = useId();
  return (
    <div className={s.pc}>
      <div className={s.rw}>
        <label htmlFor={id} className="visually-hidden">
          کد تخفیف
        </label>
        <input
          id={id}
          className={s.in}
          type="text"
          dir="ltr"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="کد تخفیف را وارد کنید"
          value={value}
          aria-invalid={status === 'err' || undefined}
          aria-describedby={message ? `${id}-m` : undefined}
          onChange={(e) => onInput?.(normalizeDigits(e.target.value).toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && onApply?.()}
        />
        <button type="button" className={s.ap} onClick={onApply} disabled={busy || !value.trim()}>
          اعمال
        </button>
      </div>
      {message ? (
        <p
          id={`${id}-m`}
          className={[s.ms, status === 'ok' && s.ok, status === 'err' && s.err].filter(Boolean).join(' ')}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
