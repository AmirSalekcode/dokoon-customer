import s from './ErrorPage.module.css';

export interface ErrorPageProps {
  /** Display code (Persian digits), e.g. «۵۰۳». Empty for offline. */
  code?: string;
  title: string;
  text: string;
  /** Icon path data (24×24). */
  d: string;
  cta?: string;
  ctaSecondary?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}

/** Full-page error: code, title, text, icon, primary + optional secondary action. */
export function ErrorPage({
  code,
  title,
  text,
  d,
  cta = 'تلاش دوباره',
  ctaSecondary,
  onPrimary,
  onSecondary,
}: ErrorPageProps) {
  return (
    <div className={s.w} role="alert">
      <div className={s.ic}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={d} />
        </svg>
      </div>
      {code ? <div className={s.cd}>{code}</div> : null}
      <h1 className={s.t}>{title}</h1>
      <p className={s.x}>{text}</p>
      <div className={s.a}>
        <button type="button" className={s.p} onClick={onPrimary}>
          {cta}
        </button>
        {ctaSecondary ? (
          <button type="button" className={s.s} onClick={onSecondary}>
            {ctaSecondary}
          </button>
        ) : null}
      </div>
    </div>
  );
}
