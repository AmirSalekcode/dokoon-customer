import s from './StepBar.module.css';

export interface StepVM {
  label: string;
  sub?: string;
  state: 'done' | 'cur' | 'todo';
}

export interface StepBarProps {
  steps: StepVM[];
}

/** Vertical order status steps (placed → confirmed → preparing → on the way → delivered). */
export function StepBar({ steps }: StepBarProps) {
  return (
    <ol className={s.sb} aria-label="مراحل سفارش">
      {steps.map((st) => (
        <li
          key={st.label}
          className={[s.st, st.state === 'done' && s.done, st.state === 'cur' && s.cur]
            .filter(Boolean)
            .join(' ')}
          aria-current={st.state === 'cur' ? 'step' : undefined}
        >
          <span className={s.dot}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12l5 5 9-10" />
            </svg>
          </span>
          <span className={s.tx}>
            <b>{st.label}</b>
            {st.sub ? <small>{st.sub}</small> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
