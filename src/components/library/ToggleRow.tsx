import s from './ToggleRow.module.css';

export interface ToggleRowProps {
  title: string;
  sub?: string;
  on: boolean;
  /** Locked switch (e.g. essential cookies). */
  disabled?: boolean;
  onFlip?: () => void;
}

/** Row with an on/off switch (settings). */
export function ToggleRow({ title, sub, on, disabled, onFlip }: ToggleRowProps) {
  return (
    <div className={s.r}>
      <span className={s.tx}>
        <span className={s.t}>{title}</span>
        {sub ? <span className={s.s}>{sub}</span> : null}
      </span>
      <button
        type="button"
        className={[s.sw, on && s.on].filter(Boolean).join(' ')}
        role="switch"
        aria-checked={on}
        aria-label={title}
        disabled={disabled}
        onClick={onFlip}
      />
    </div>
  );
}
