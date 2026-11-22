import { useId } from 'react';
import s from './OnlineSwitch.module.css';

export interface OnlineSwitchProps {
  online: boolean;
  /** One line under the title, e.g. «پیشنهادهای نزدیک برای شما فرستاده می‌شود». */
  note: string;
  /** The status request is running: the switch is blocked and says so. */
  busy?: boolean;
  onFlip: () => void;
}

/**
 * Big online/offline switch (role=switch). Online = orange with a soft pulse (off under reduced motion),
 * offline = grey. The caller decides whether flipping is allowed (e.g. not offline during an active order).
 */
export function OnlineSwitch({ online, note, busy, onFlip }: OnlineSwitchProps) {
  const titleId = useId();
  const noteId = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={online}
      aria-labelledby={titleId}
      aria-describedby={noteId}
      aria-busy={busy || undefined}
      disabled={busy}
      className={[s.sw, online && s.on].filter(Boolean).join(' ')}
      onClick={onFlip}
    >
      <span className={s.text}>
        <b id={titleId}>{online ? 'آنلاین هستید' : 'آفلاین هستید'}</b>
        <span id={noteId}>{note}</span>
      </span>
      <span className={s.knob} aria-hidden="true" />
    </button>
  );
}
