import s from './ActionBar.module.css';

export interface ActionBarProps {
  label: string;
  /** Pre-formatted value (e.g. «۲۸۵٬۰۰۰ تومان»), hidden while disabled. */
  valueText?: string;
  disabled?: boolean;
  onTap?: () => void;
}

/** Sticky bottom CTA with amount (continue / pay / place order). */
export function ActionBar({ label, valueText, disabled, onTap }: ActionBarProps) {
  return (
    <div className={s.ab}>
      <button type="button" className={s.bt} disabled={disabled} onClick={onTap}>
        <span>{label}</span>
        {valueText && !disabled ? <span className={s.val}>{valueText}</span> : null}
      </button>
    </div>
  );
}
