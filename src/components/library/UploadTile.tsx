import { Icon, type IconName } from '../primitives/Icon';
import s from './UploadTile.module.css';

export interface UploadTileProps {
  label: string;
  /** Second line: hint before upload, status after (e.g. «بارگذاری شد · تغییر»), from the parent. */
  sub?: string;
  icon?: IconName;
  /** Raw icon path (data-driven document types). */
  d?: string;
  done?: boolean;
  /** Upload in progress: disabled, announced as busy. */
  busy?: boolean;
  onTap: () => void;
}

/** Upload tile (registration documents, logo, dish photo). The parent owns the file input/uploader. */
export function UploadTile({ label, sub, icon = 'plus', d, done, busy, onTap }: UploadTileProps) {
  return (
    <button
      type="button"
      className={[s.tile, done && s.done].filter(Boolean).join(' ')}
      aria-label={sub ? `${label}، ${sub}` : label}
      aria-busy={busy || undefined}
      disabled={busy}
      onClick={onTap}
    >
      {busy ? (
        <span className={s.spinner} aria-hidden="true" />
      ) : (
        <Icon name={done ? 'check' : d ? undefined : icon} d={done ? undefined : d} size={28} />
      )}
      <b className={s.label}>{label}</b>
      {sub ? <small className={s.sub}>{sub}</small> : null}
    </button>
  );
}
