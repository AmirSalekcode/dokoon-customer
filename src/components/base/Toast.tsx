import { useToast, type ToastItem } from '@/ui/toast';
import s from './base.module.css';

/** Presentational toast. */
export function Toast({ text, tone = 'info' }: Pick<ToastItem, 'text' | 'tone'>) {
  return <div className={[s.toast, s[`toast_${tone}`]].join(' ')}>{text}</div>;
}

/** Mount once inside the app frame. aria-live announces messages to screen readers. */
export function ToastHost() {
  const toasts = useToast((st) => st.toasts);
  return (
    <div className={s.toastHost} aria-live="polite" role="status">
      {toasts.map((t) => (
        <Toast key={t.id} text={t.text} tone={t.tone} />
      ))}
    </div>
  );
}
