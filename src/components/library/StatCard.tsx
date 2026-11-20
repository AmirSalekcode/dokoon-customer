import { Icon, type IconName } from '../primitives/Icon';
import s from './StatCard.module.css';

export interface StatCardProps {
  label: string;
  /** Pre-formatted value (Persian digits, «تومان»). */
  value: string;
  /** Comparison text from the server (e.g. «۱۲٪ بیشتر از دیروز»). */
  sub?: string;
  /** up = better than the previous period (brand color), down = worse (danger). No green (D-108). */
  tone?: 'up' | 'down';
  icon?: IconName;
  d?: string;
}

/** Report figure card (revenue, orders, average order, preparation time). */
export function StatCard({ label, value, sub, tone, icon, d }: StatCardProps) {
  return (
    <div className={s.card}>
      <div className={s.head}>
        {icon || d ? (
          <span className={s.icon}>
            <Icon name={icon} d={d} size={20} />
          </span>
        ) : null}
        <span>{label}</span>
      </div>
      <div className={s.value}>{value}</div>
      {sub ? <div className={[s.sub, tone && s[tone]].filter(Boolean).join(' ')}>{sub}</div> : null}
    </div>
  );
}
