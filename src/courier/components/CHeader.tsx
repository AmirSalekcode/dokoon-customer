import { Logo } from '@/components/primitives/Logo';
import s from './CHeader.module.css';

export interface CHeaderProps {
  /** Courier name, e.g. «مهدی کریمی». */
  who: string;
  /** City · vehicle, e.g. «شهرضا · موتورسیکلت». */
  sub: string;
  /** Pre-formatted earnings today, e.g. «۴۸۰٬۰۰۰ تومان». */
  earn: string;
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
          <p>{sub}</p>
        </div>
        <p className={s.earn}>
          <small>درآمد امروز</small>
          <b>{earn}</b>
        </p>
      </div>
    </header>
  );
}
