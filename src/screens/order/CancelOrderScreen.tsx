import { useId, useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/base/Button';
import { SelectCard } from '@/components/library/SelectCard';
import { TopBar } from '@/components/library/TopBar';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from '../registry';
import s from './order.module.css';

/** Contract has `reasonId` but no list endpoint: ids are agreed client-side (contract-notes #8). */
export const CANCEL_REASONS = [
  { id: 'mistake', title: 'اشتباه سفارش دادم' },
  { id: 'too_slow', title: 'زمان تحویل طولانی است' },
  { id: 'change', title: 'می‌خواهم سفارش را تغییر دهم' },
  { id: 'other', title: 'سایر' },
];

/** Cancel an order (screen-specs §4 cancel): only while the restaurant has not accepted it. */
export function CancelOrderScreen({ route }: ScreenProps) {
  const orderId = route.params.orderId ?? '';
  const back = useNav((st) => st.back);
  const [reason, setReason] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const textId = useId();
  const ok = !!reason && (reason !== 'other' || text.trim().length >= 3) && !busy;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const { error: err } = await api.POST('/orders/{id}/cancel', {
        params: { path: { id: orderId } },
        body: { reasonId: reason, ...(text.trim() ? { text: text.trim() } : {}) },
      });
      if (err !== undefined) {
        setError((err as { message?: string }).message || 'لغو سفارش انجام نشد.');
        return;
      }
      toast('سفارش لغو شد', 'success');
      back();
    } catch {
      setError('اتصال برقرار نشد. دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.page}>
      <TopBar title="لغو سفارش" onBack={() => back()} />
      <div className={s.body}>
        <h2 id="cancel-h" className={s.h}>
          دلیل لغو سفارش را انتخاب کنید
        </h2>
        <div role="radiogroup" aria-labelledby="cancel-h" className={s.stack}>
          {CANCEL_REASONS.map((r) => (
            <SelectCard
              key={r.id}
              radio
              title={r.title}
              selected={reason === r.id}
              onPick={() => setReason(r.id)}
            />
          ))}
        </div>
        {reason === 'other' ? (
          <>
            <label htmlFor={textId} className={s.label}>
              توضیح
            </label>
            <textarea
              id={textId}
              className={s.text}
              maxLength={300}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </>
        ) : null}
        {error ? (
          <p className={s.alert} role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className={s.dock}>
        <Button size="lg" block variant="danger" disabled={!ok} onClick={() => void submit()}>
          تأیید لغو سفارش
        </Button>
      </div>
    </div>
  );
}
