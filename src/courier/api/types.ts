import type { components } from './schema';

/** Courier contract types (courier/dokoon-courier-openapi.yaml, `npm run api:gen:courier`). */
type S = components['schemas'];

export type Me = S['Me'];
/**
 * `new` = this phone has no courier account yet (go to registration). Not in the contract enum yet
 * (contract-notes 31); a missing status means the same.
 */
export type CourierStatus = NonNullable<Me['status']> | 'new';
export type CourierDoc = NonNullable<Me['docs']>[number];
export type DocType = S['DocType'];
export type Offer = S['Offer'];
export type ActiveOrder = S['ActiveOrder'];
export type OrderStage = NonNullable<ActiveOrder['stage']>;
export type OrderItem = NonNullable<ActiveOrder['items']>[number];

/** `POST /c/auth/verify` body as the native app receives it (token in the body, contract-notes 30). */
export type VerifyResult = Me & { accessToken?: string };

/** Error body `{code, message, fields}` — the courier contract declares none yet (contract-notes 37). */
export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

// ---- Proposed shapes for responses the contract leaves untyped (contract-notes 34) ----

/** One finished trip (`GET /c/orders/history`). */
export interface HistoryItem {
  id: string;
  no: number;
  rest: string;
  toArea: string;
  /** date-time */
  deliveredAt: string;
  km: number;
  earn: number;
  cash: boolean;
  /** Cash the courier entered on delivery (cash orders only). */
  cashCollected?: number;
}
export interface HistoryPage {
  items: HistoryItem[];
  /** Absent on the last page. */
  nextCursor?: string;
}

export type EarningsPeriod = 'today' | 'week' | 'month';
export interface ChartBar {
  /** Server-made label (hour, weekday or week), shown as is. */
  label: string;
  amount: number;
}
/** `GET /c/earnings?period=` — every number is server-computed (cash rule undecided, D-94). */
export interface Earnings {
  period: EarningsPeriod;
  total: number;
  trips: number;
  hours: number;
  avg: number;
  /** Payable to the courier at the next settlement. */
  balance: number;
  /** Cash collected from customers and not yet handed to Dokoon. */
  cashHeld: number;
  chart: ChartBar[];
}

/** One weekly payout (`GET /c/settlements`). */
export interface Settlement {
  id: string;
  /** date */
  periodStart: string;
  /** date */
  periodEnd: string;
  amount: number;
  status: 'paid' | 'pending';
  /** date-time */
  paidAt?: string;
  /** Masked by the server (`••••4210`). */
  shebaMasked: string;
}

/** `POST /c/orders/{id}/deliver` response. */
export interface DeliverResult {
  earn?: number;
  cashMismatch?: boolean;
}
