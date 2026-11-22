import { Logo } from '@/components/primitives/Logo';
import s from './CHeader.module.css';

export interface CHeaderProps {
  /** Courier name, e.g. «مهدی کریمی». */
  who: string;
  /** City · vehicle, e.g. «شهرضا · موتورسیکلت»; omitted before the profile has loaded. */
  sub?: string;
  /** Pre-formatted earnings today, e.g. «۴۸۰٬۰۰۰ تومان»; omitted (no chip) until known. */
  earn?: string;
}

/** Orange courier header: white logo, «پیک» tag, the courier's name and today's earnings. */
export function CHeader({ who, sub, earn }: CHeaderProps) {
  return (
    <header className={s.header}>
      <div className={s.top}>
        <Logo height={26} />
        <span className={s.tag}>پیک</span>
      </div>
      <div className={s.body}>
        <div className={s.name}>
          <h1>{who}</h1>
          {sub ? <p>{sub}</p> : null}
        </div>
        {earn ? (
          <p className={s.earn}>
            <small>درآمد امروز</small>
            <b>{earn}</b>
          </p>
        ) : null}
      </div>
    </header>
  );
}
