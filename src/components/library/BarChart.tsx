import s from './BarChart.module.css';

export interface Bar {
  label: string;
  /** Raw value used for the bar height (relative to the largest). */
  value: number;
  /** Pre-formatted value shown above the bar and read by screen readers. */
  valueText: string;
  /** Highlight (e.g. the current hour/day). */
  on?: boolean;
}

export interface BarChartProps {
  title: string;
  bars: Bar[];
  /** Text alternative when there is no data. */
  empty?: string;
}

const MIN_HEIGHT = 3;

/** Simple bar chart. The bars are one image with a full text alternative (role=img + aria-label). */
export function BarChart({ title, bars, empty = '' }: BarChartProps) {
  const max = Math.max(0, ...bars.map((b) => b.value));
  const alt = bars.length ? bars.map((b) => `${b.label} ${b.valueText}`).join('، ') : empty;
  const height = (v: number) => (max > 0 ? Math.max(MIN_HEIGHT, Math.round((v / max) * 100)) : MIN_HEIGHT);
  return (
    <section className={s.card}>
      <h4 className={s.title}>{title}</h4>
      <div className={s.graph} role="img" aria-label={`${title}: ${alt}`}>
        {bars.map((b, i) => (
          <div key={`${i}-${b.label}`} className={[s.bar, b.on && s.on].filter(Boolean).join(' ')}>
            <span className={s.value} aria-hidden="true">
              {b.valueText}
            </span>
            <div className={s.rect} data-bar style={{ height: `${height(b.value)}%` }} />
          </div>
        ))}
      </div>
      <div className={s.labels} aria-hidden="true">
        {bars.map((b, i) => (
          <span key={`${i}-${b.label}`}>{b.label}</span>
        ))}
      </div>
    </section>
  );
}
