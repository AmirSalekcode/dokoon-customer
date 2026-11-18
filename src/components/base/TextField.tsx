import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { normalizeDigits, toFaDigits } from '@/lib/format';
import s from './base.module.css';

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'size'
> {
  label: string;
  value: string;
  /** Receives the normalized value (Persian/Arabic digits → ASCII when `numeric`). */
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  /** Digits-only field (phone, OTP): shows Persian digits, emits ASCII digits. */
  numeric?: boolean;
  maxDigits?: number;
  size?: 'md' | 'lg';
  /** Extra class for the <input> (e.g. large letter-spaced OTP digits). */
  inputClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    value,
    onChange,
    error,
    hint,
    numeric,
    maxDigits,
    size = 'md',
    id,
    className,
    inputClassName,
    ...rest
  },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const msgId = `${inputId}-msg`;
  return (
    <div className={[s.field, className].filter(Boolean).join(' ')}>
      <label className={s.label} htmlFor={inputId}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={[
          s.input,
          size === 'lg' && s.inputLg,
          error && s.inputErr,
          numeric && s.ltr,
          inputClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        value={numeric ? toFaDigits(value) : value}
        inputMode={numeric ? 'numeric' : rest.inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? msgId : undefined}
        onChange={(e) => {
          let v = e.target.value;
          if (numeric) {
            v = normalizeDigits(v).replace(/\D/g, '');
            if (maxDigits) v = v.slice(0, maxDigits);
          }
          onChange(v);
        }}
        {...rest}
      />
      {error ? (
        <p id={msgId} className={s.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className={s.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});
