import s from './DocStatusRow.module.css';

export type DocStatus = 'ok' | 'wait' | 'bad';

export interface DocStatusView {
  label: string;
  /** «اعتبار تا ۱۴۰۸/۰۳» */
  sub: string;
  status: DocStatus;
  /** «تأیید شده» / «در حال بررسی» / «نزدیک انقضا» */
  statusLabel: string;
  /** Expired, expiring or rejected: show «بارگذاری مجدد». */
  canRenew: boolean;
  /** Button text; «بارگذاری» for a document never sent (default «بارگذاری مجدد»). */
  actionLabel?: string;
}

export interface DocStatusRowProps {
  doc: DocStatusView;
  onRenew: () => void;
}

/** One registration document with its review state (black ok, yellow wait, red bad — never green). */
export function DocStatusRow({ doc: d, onRenew }: DocStatusRowProps) {
  return (
    <div className={s.row}>
      <p className={s.text}>
        <b>{d.label}</b>
        <small>{d.sub}</small>
      </p>
      <span className={[s.badge, s[d.status]].join(' ')}>{d.statusLabel}</span>
      {d.canRenew ? (
        <button
          type="button"
          className={s.renew}
          onClick={onRenew}
          aria-label={`${d.actionLabel ?? 'بارگذاری مجدد'} ${d.label}`}
        >
          {d.actionLabel ?? 'بارگذاری مجدد'}
        </button>
      ) : null}
    </div>
  );
}
