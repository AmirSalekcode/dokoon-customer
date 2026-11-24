import type { DocStatusView } from '../components/DocStatusRow';
import type { CourierDoc, DocType } from '../api/types';

/*
 * Document status for «مدارک من» and the account-tab warning dot. The list of documents comes from
 * `GET /c/doc-types` (never hard-coded); each one's review state from `Me.docs`.
 */

/** A valid document expiring within this many days already asks for renewal. */
export const EXPIRY_WARN_DAYS = 30;

const DAY = 86_400_000;
const dateFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: 'Asia/Tehran',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const at = (iso: string) => Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00+03:30` : iso);

export type DocState = 'ok' | 'expiring' | 'expired' | 'wait' | 'rejected' | 'missing';

/** One row's state. `bad` with a future expiry is the server saying «نزدیک انقضا». */
export function docState(doc: CourierDoc | undefined, now = Date.now()): DocState {
  if (!doc) return 'missing';
  const exp = doc.expiresAt ? at(doc.expiresAt) : NaN;
  if (doc.status === 'wait') return 'wait';
  if (!Number.isNaN(exp) && exp < now) return 'expired';
  if (doc.status === 'bad') return Number.isNaN(exp) ? 'rejected' : 'expiring';
  if (!Number.isNaN(exp) && exp - now <= EXPIRY_WARN_DAYS * DAY) return 'expiring';
  return 'ok';
}

const LABEL: Record<DocState, string> = {
  ok: 'تأیید شده',
  expiring: 'نزدیک انقضا',
  expired: 'منقضی شده',
  wait: 'در حال بررسی',
  rejected: 'رد شده',
  missing: 'بارگذاری نشده',
};

/** Row view: black ok, yellow in review, red for everything that needs the courier. */
export function docRow(type: DocType, doc: CourierDoc | undefined, now = Date.now()): DocStatusView {
  const st = docState(doc, now);
  const exp = doc?.expiresAt ? dateFmt.format(at(doc.expiresAt)) : '';
  const sub =
    st === 'wait'
      ? 'برای بررسی مدیر شهر فرستاده شد'
      : st === 'rejected'
        ? 'تأیید نشد؛ دوباره بارگذاری کنید'
        : st === 'missing'
          ? type.required
            ? 'برای دریافت سفارش لازم است'
            : 'اختیاری'
          : exp
            ? `${st === 'expired' ? 'اعتبار تمام شد' : 'اعتبار تا'} ${exp}`
            : (type.sub ?? '');
  return {
    label: type.label ?? '',
    sub,
    // Red only when the courier must act; an optional document never sent is just yellow.
    status: st === 'ok' ? 'ok' : st === 'wait' || (st === 'missing' && !type.required) ? 'wait' : 'bad',
    statusLabel: LABEL[st],
    canRenew: st !== 'ok' && st !== 'wait',
    ...(st === 'missing' ? { actionLabel: 'بارگذاری' } : {}),
  };
}

/**
 * Account-tab row: a dot when a document needs the courier. Uses `Me.docs` only (doc-types are loaded on
 * the documents page), so a never-uploaded document shows its warning there.
 */
export function docsSummary(docs: CourierDoc[] | undefined, now = Date.now()): { sub: string; dot: boolean } {
  const states = (docs ?? []).map((d) => docState(d, now));
  if (states.includes('expired')) return { sub: 'یک مدرک منقضی شده؛ تمدید کنید', dot: true };
  if (states.includes('rejected')) return { sub: 'یک مدرک تأیید نشد', dot: true };
  if (states.includes('expiring')) return { sub: 'یک مدرک نزدیک انقضاست', dot: true };
  if (states.includes('wait')) return { sub: 'مدرکی در حال بررسی است', dot: false };
  return { sub: states.length ? 'همه‌ی مدارک تأیید شده' : 'وضعیت مدارک شما', dot: false };
}
