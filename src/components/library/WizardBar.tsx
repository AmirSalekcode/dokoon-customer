import { toFaDigits } from '@/lib/format';
import { Icon } from '../primitives/Icon';
import s from './WizardBar.module.css';

export interface WizardStep {
  label: string;
  state: 'done' | 'cur' | 'todo';
}

export interface WizardBarProps {
  /** Accessible name, e.g. «مراحل ثبت‌نام». */
  label: string;
  steps: WizardStep[];
}

/** Multi-step progress (restaurant registration): done steps are checked, the current one is marked. */
export function WizardBar({ label, steps }: WizardBarProps) {
  return (
    <ol className={s.wrap} aria-label={label}>
      {steps.map((st, i) => (
        <li
          key={`${i}-${st.label}`}
          className={[s.step, st.state === 'done' && s.done, st.state === 'cur' && s.cur]
            .filter(Boolean)
            .join(' ')}
          aria-current={st.state === 'cur' ? 'step' : undefined}
        >
          <span className={s.dot}>
            {st.state === 'done' ? <Icon name="check" size={16} /> : toFaDigits(i + 1)}
          </span>
          <span className={s.label}>{st.label}</span>
        </li>
      ))}
    </ol>
  );
}
