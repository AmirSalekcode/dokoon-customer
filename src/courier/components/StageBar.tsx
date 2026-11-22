import { Icon } from '@/components/primitives/Icon';
import { toFaDigits } from '@/lib/format';
import s from './StageBar.module.css';

export type StageState = 'done' | 'cur' | 'todo';

export interface StageBarProps {
  /** The delivery steps in order, e.g. رستوران / تحویل‌گیری / مشتری / تحویل. */
  stages: { label: string; state: StageState }[];
}

const STATE_TEXT: Record<StageState, string> = {
  done: 'انجام شد',
  cur: 'مرحله‌ی فعلی',
  todo: 'مانده',
};

/** Delivery progress: done steps are orange with a tick, the current one pulses (off under reduced motion). */
export function StageBar({ stages }: StageBarProps) {
  return (
    <ol className={s.bar} aria-label="مراحل تحویل">
      {stages.map((st, i) => (
        <li
          key={st.label}
          className={[s.step, st.state === 'done' && s.done, st.state === 'cur' && s.cur]
            .filter(Boolean)
            .join(' ')}
          aria-current={st.state === 'cur' ? 'step' : undefined}
        >
          <span className={s.dot} aria-hidden="true">
            {st.state === 'done' ? <Icon name="check" size={18} /> : toFaDigits(String(i + 1))}
          </span>
          <span className={s.label}>
            {st.label}
            <span className="visually-hidden">، {STATE_TEXT[st.state]}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
