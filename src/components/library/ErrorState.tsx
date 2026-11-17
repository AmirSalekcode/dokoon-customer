import { Art } from '../primitives/Art';
import s from './ErrorState.module.css';

export interface ErrorStateProps {
  title?: string;
  text?: string;
  onRetry?: () => void;
}

/** Inline error with retry (list failed to load). */
export function ErrorState({
  title = 'مشکلی پیش آمد',
  text = 'اتصال برقرار نشد. دوباره تلاش کنید.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className={s.er} role="alert">
      <Art src="dk-cafe" className={s.art} />
      <h4>{title}</h4>
      <p>{text}</p>
      <button type="button" className={s.rt} onClick={onRetry}>
        تلاش دوباره
      </button>
    </div>
  );
}
