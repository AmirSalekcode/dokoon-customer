import { useId, useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/base/Button';
import { SelectCard } from '@/components/library/SelectCard';
import { TopBar } from '@/components/library/TopBar';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from '../registry';
import s from './order.module.css';

/** Contract has `typeId` but no list endpoint: ids are agreed client-side (contract-notes #8). */
export const REPORT_TYPES = [
  { id: 'missing', title: 'غذا کامل نبود' },
  { id: 'wrong', title: 'غذای اشتباه رسید' },
  { id: 'late', title: 'تأخیر در تحویل' },
  { id: 'quality', title: 'کیفیت غذا مناسب نبود' },
  { id: 'other', title: 'سایر' },
];

/**
 * Report a problem (screen-specs §4 report). Photo attachment needs an upload endpoint that the
 * contract does not have yet (contract-notes #8), so it is not offered.
 */
export function ReportScreen({ route }: ScreenProps) {
  const orderId = route.params.orderId ?? '';
  const back = useNav((st) => st.back);
  const [type, setType] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const textId = useId();
  const ok = !!type && text.trim().length >= 3 && !busy;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const { error: err } = await api.POST('/orders/{id}/report', {
        params: { path: { id: orderId } },
        body: { typeId: type, text: text.trim() },
      });
      if (err !== undefined) {
        setError((err as { message?: string }).message || 'ثبت گزارش انجام نشد.');
        return;
      }
      toast('گزارش شما ثبت شد', 'success');
      back();
    } catch {
      setError('اتصال برقرار نشد. دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.page}>
      <TopBar title="گزارش مشکل" onBack={() => back()} />
      <div className={s.body}>
        <h2 id="report-h" className={s.h}>
          چه مشکلی پیش آمد؟
        </h2>
        <div role="radiogroup" aria-labelledby="report-h" className={s.stack}>
          {REPORT_TYPES.map((r) => (
            <SelectCard
              key={r.id}
              radio
              title={r.title}
              selected={type === r.id}
              onPick={() => setType(r.id)}
            />
          ))}
        </div>
        <label htmlFor={textId} className={s.label}>
          توضیح مشکل
        </label>
        <textarea
          id={textId}
          className={s.text}
          maxLength={500}
          placeholder="مشکل را کوتاه توضیح دهید"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {error ? (
          <p className={s.alert} role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className={s.dock}>
        <Button size="lg" block disabled={!ok} onClick={() => void submit()}>
          ثبت گزارش
        </Button>
      </div>
    </div>
  );
}
