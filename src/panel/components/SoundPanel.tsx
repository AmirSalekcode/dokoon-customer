import { toFaDigits } from '@/lib/format';
import s from './SoundPanel.module.css';

export interface SoundPanelProps {
  playing: boolean;
  /** 1..5 */
  level: number;
  /** Line under the controls (e.g. which sound and how it repeats). */
  tone?: string;
  onPlay: () => void;
  onLevel: (n: number) => void;
}

const D_SPEAKER = 'M5 10v4h3l5 4V6l-5 4zM17 9a4 4 0 0 1 0 6';
const D_STOP = 'M7 7h10v10H7z';

/** Sound test (restaurant component library: SoundPanel): play/stop + 5 volume levels. */
export function SoundPanel({ playing, level, tone, onPlay, onLevel }: SoundPanelProps) {
  return (
    <section
      className={[s.panel, playing && s.playing].filter(Boolean).join(' ')}
      aria-label="آزمایش صدای هشدار"
    >
      <div className={s.eq} aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <i key={i} />
        ))}
      </div>
      <button type="button" className={s.play} onClick={onPlay} aria-pressed={playing}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={playing ? D_STOP : D_SPEAKER} />
        </svg>
        {playing ? 'توقف صدا' : 'پخش صدای سفارش جدید'}
      </button>
      <div className={s.volume}>
        <span id="dk-sound-level">بلندی صدا</span>
        <div className={s.segs} role="radiogroup" aria-labelledby="dk-sound-level">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === level}
              aria-label={`سطح ${toFaDigits(n)}`}
              className={n <= level ? s.on : undefined}
              onClick={() => onLevel(n)}
            />
          ))}
        </div>
      </div>
      {tone ? <p className={s.tone}>{tone}</p> : null}
    </section>
  );
}
