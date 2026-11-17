import s from './LoadingState.module.css';

export interface LoadingStateProps {
  /** 'home' = banner + categories + cards (prototype), 'list' = stacked rows. */
  variant?: 'home' | 'list';
  rows?: number;
}

/** Shimmer skeleton. */
export function LoadingState({ variant = 'home', rows = 4 }: LoadingStateProps) {
  return (
    <div className={s.ld} aria-busy="true" aria-label="در حال بارگذاری" role="status">
      {variant === 'home' ? (
        <>
          <div className={`${s.sk} ${s.banner}`} />
          <div className={s.r}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`${s.sk} ${s.circle}`} />
            ))}
          </div>
          <div className={s.r}>
            <div className={`${s.sk} ${s.card}`} />
            <div className={`${s.sk} ${s.card}`} />
          </div>
        </>
      ) : (
        Array.from({ length: rows }, (_, i) => <div key={i} className={`${s.sk} ${s.row}`} />)
      )}
    </div>
  );
}
