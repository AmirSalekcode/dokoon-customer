import { Logo } from '@/components/primitives/Logo';
import s from './RHeader.module.css';

export interface RHeaderProps {
  /** Restaurant name (the page's main heading on root tabs). */
  rest: string;
  /** Second line, e.g. «امتیاز ۴٫۷ · ۱٬۲۴۰ نظر» (formatted by the parent). */
  sub?: string;
  open: boolean;
  /** Request in flight: the switch is disabled. */
  busy?: boolean;
  onToggle: () => void;
}

/** Dark business header: logo, «رستوران» tag, restaurant name, open/closed switch (design delta §1). */
export function RHeader({ rest, sub, open, busy, onToggle }: RHeaderProps) {
  return (
    <header className={s.header}>
      <div className={s.top}>
        <Logo className={s.logo} height={26} />
        <span className={s.tag}>رستوران</span>
      </div>
      <div className={s.bottom}>
        <div className={s.name}>
          <h1>{rest}</h1>
          {sub ? <p>{sub}</p> : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={open}
          aria-label="باز یا بسته بودن رستوران"
          aria-busy={busy || undefined}
          disabled={busy}
          className={[s.switch, open && s.on].filter(Boolean).join(' ')}
          onClick={onToggle}
        >
          <i aria-hidden="true" />
          <span aria-hidden="true">{open ? 'باز' : 'بسته'}</span>
        </button>
      </div>
    </header>
  );
}
