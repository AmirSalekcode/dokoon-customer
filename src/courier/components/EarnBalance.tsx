import s from './EarnBalance.module.css';

export interface EarnBalanceProps {
  /** Payable at the next settlement, pre-formatted. */
  balance: string;
  /** Cash collected and still with the courier. */
  cash: string;
  /** Owed by Dokoon to the courier. */
  dokoon: string;
  /** Explanation, e.g. that the numbers are samples until the cash settlement rule is decided. */
  note: string;
}

/**
 * Balance card of the Earnings tab. Every number comes from the server (`GET /c/earnings`); the cash
 * settlement rule is undecided, so the app never computes these (sample numbers in the mock).
 */
export function EarnBalance({ balance, cash, dokoon, note }: EarnBalanceProps) {
  return (
    <section className={s.card} aria-label="مانده‌ی حساب">
      <p className={s.balance}>
        <small>مانده‌ی قابل تسویه</small>
        <b>{balance}</b>
      </p>
      <dl className={s.split}>
        <div>
          <dt>نقدی در دست شما</dt>
          <dd>{cash}</dd>
        </div>
        <div>
          <dt>طلب از دکون</dt>
          <dd>{dokoon}</dd>
        </div>
      </dl>
      <p className={s.note}>{note}</p>
    </section>
  );
}
