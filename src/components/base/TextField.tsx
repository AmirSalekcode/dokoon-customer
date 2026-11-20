import { forwardRef, useId, type InputHTMLAttributes, type Ref } from 'react';
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
  /** Digits-only field (phone, OTP, price): shows Persian digits, emits ASCII digits. */
  numeric?: boolean;
  maxDigits?: number;
  size?: 'md' | 'lg';
  /** Extra class for the <input> (e.g. large letter-spaced OTP digits). */
  inputClassName?: string;
  /** Unit shown inside the field's end (e.g. «تومان», «دقیقه»); also read by screen readers. */
  suffix?: string;
  /** Left-to-right text that is not digits-only (Sheba, e-mail). */
  ltr?: boolean;
  /** > 1 → multi-line textarea (support message, dish description). */
  rows?: number;
}

/** Multi-purpose text field: label, hint/error, numeric normalization, suffix, ltr, multi-line. */
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
    suffix,
    ltr,
    rows,
    ...rest
  },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const msgId = `${inputId}-msg`;
  const suffixId = `${inputId}-suffix`;
  const describedBy = [error || hint ? msgId : null, suffix ? suffixId : null].filter(Boolean).join(' ');
  const multiline = (rows ?? 1) > 1;

  const emit = (raw: string) => {
    let v = raw;
    if (numeric) {
      v = normalizeDigits(v).replace(/\D/g, '');
      if (maxDigits) v = v.slice(0, maxDigits);
    }
    onChange(v);
  };
  const common = {
    id: inputId,
    className: [
      s.input,
      size === 'lg' && s.inputLg,
      multiline && s.textarea,
      error && s.inputErr,
      numeric && s.ltr,
      suffix && s.withSuffix,
      inputClassName,
    ]
      .filter(Boolean)
      .join(' '),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
    dir: ltr ? 'ltr' : undefined,
  } as const;

  return (
    <div className={[s.field, className].filter(Boolean).join(' ')}>
      <label className={s.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={s.control}>
        {multiline ? (
          <textarea
            {...common}
            ref={ref as unknown as Ref<HTMLTextAreaElement>}
            rows={rows}
            value={value}
            placeholder={rest.placeholder}
            maxLength={rest.maxLength}
            disabled={rest.disabled}
            required={rest.required}
            onChange={(e) => emit(e.target.value)}
          />
        ) : (
          <input
            ref={ref}
            {...common}
            value={numeric ? toFaDigits(value) : value}
            inputMode={numeric ? 'numeric' : rest.inputMode}
            onChange={(e) => emit(e.target.value)}
            {...rest}
          />
        )}
        {suffix ? (
          <span id={suffixId} className={s.suffix}>
            {suffix}
          </span>
        ) : null}
      </div>
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
