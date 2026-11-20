import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { formatMoney, toFaDigits } from '@/lib/format';
import { readStorage, writeStorage } from '@/lib/storage';
import type { Order } from '../api/types';
import { useRestaurant } from '../state/restaurant';
import { orderNo, payText, statusLabel } from './present';
import s from './print.module.css';

/**
 * Receipt printing (D-97): the browser/system print dialog (`window.print`) with an 80 mm thermal style
 * or A4, chosen per device (`dk-r-print`). The receipt renders into its own node next to the app; the
 * print stylesheet hides everything else, and a named @page sets the paper size.
 */
export type Paper = '80mm' | 'a4';
export const PRINT_KEY = 'dk-r-print';

interface PrintState {
  order: Order | null;
  paper: Paper;
  setPaper: (p: Paper) => void;
}
export const usePrint = create<PrintState>((set) => ({
  order: null,
  paper: readStorage(PRINT_KEY) === 'a4' ? 'a4' : '80mm',
  setPaper: (paper) => {
    writeStorage(PRINT_KEY, paper);
    set({ paper });
  },
}));

const dateTime = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Print one order (the dialog opens after the receipt has rendered). */
export function printReceipt(order: Order, print: () => void = () => window.print()) {
  usePrint.setState({ order });
  requestAnimationFrame(() => requestAnimationFrame(print));
}

/** The receipt itself (also unit-tested on its own). */
export function Receipt({ order: o, paper, restaurant }: { order: Order; paper: Paper; restaurant: string }) {
  return (
    <article
      className={[s.receipt, paper === 'a4' ? s.a4 : s.thermal].join(' ')}
      dir="rtl"
      lang="fa"
      data-testid="receipt"
    >
      <header className={s.head}>
        <h1>{restaurant}</h1>
        <p>سفارش {orderNo(o)}</p>
        {o.placedAt ? <p>{dateTime.format(new Date(o.placedAt))}</p> : null}
        <p>{statusLabel(o)}</p>
      </header>
      <table className={s.items}>
        <thead>
          <tr>
            <th scope="col">تعداد</th>
            <th scope="col">غذا</th>
            <th scope="col">مبلغ</th>
          </tr>
        </thead>
        <tbody>
          {(o.items ?? []).map((i, k) => (
            <tr key={k}>
              <td>{toFaDigits(i.qty ?? 1)}</td>
              <td>
                {i.name}
                {i.optionsText ? <small>{i.optionsText}</small> : null}
              </td>
              <td>{formatMoney(i.price ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {o.note ? (
        <p className={s.note}>
          <b>توضیح مشتری: </b>
          {o.note}
        </p>
      ) : null}
      <p className={s.total}>
        <span>مبلغ غذاها</span>
        <b>{formatMoney(o.foodsTotal ?? 0)}</b>
      </p>
      <p>{payText(o)}</p>
      <footer className={s.foot}>
        <p>
          {o.customerName}
          {o.areaText ? ` · ${o.areaText}` : ''}
        </p>
        {o.prepMinutes ? <p>زمان آماده‌سازی: {toFaDigits(o.prepMinutes)} دقیقه</p> : null}
        <p>دکون</p>
      </footer>
    </article>
  );
}

/** Mount once in the shell: holds the receipt being printed (hidden on screen). */
export function PrintHost() {
  const order = usePrint((st) => st.order);
  const paper = usePrint((st) => st.paper);
  const name = useRestaurant((st) => st.profile?.name ?? '');
  if (!order) return null;
  return createPortal(
    <div className={s.root} data-paper={paper}>
      <Receipt order={order} paper={paper} restaurant={name} />
    </div>,
    document.body,
  );
}
