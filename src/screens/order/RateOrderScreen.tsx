import { useId, useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/base/Button';
import { StarPicker } from '@/components/library/StarPicker';
import { TopBar } from '@/components/library/TopBar';
import { toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from '../registry';
import s from './order.module.css';

const LABELS = ['خیلی بد', 'بد', 'معمولی', 'خوب', 'عالی'];

const stars = (value: number, set: (n: number) => void) =>
  [1, 2, 3, 4, 5].map((n) => ({ label: `${toFaDigits(n)} ستاره`, on: n <= value, onPick: () => set(n) }));

/** Rate a delivered order (screen-specs §4 rateorder): restaurant stars required, courier optional. */
export function RateOrderScreen({ route }: ScreenProps) {
  const orderId = route.params.orderId ?? '';
  const back = useNav((st) => st.back);
  const [rest, setRest] = useState(0);
  const [courier, setCourier] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const textId = useId();

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const { error: err } = await api.POST('/orders/{id}/rating', {
        params: { path: { id: orderId } },
        body: {
          restaurantStars: rest,
          ...(courier ? { courierStars: courier } : {}),
          ...(text.trim() ? { text: text.trim() } : {}),
        },
      });
      if (err !== undefined) {
        setError((err as { message?: string }).message || 'ثبت امتیاز انجام نشد.');
        return;
      }
      toast('ممنون از امتیاز شما', 'success');
      back();
    } catch {
      setError('اتصال برقرار نشد. دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.page}>
      <TopBar title="امتیاز به سفارش" onBack={() => back()} />
      <div className={s.body}>
        <h2 className={s.h}>رستوران</h2>
        <StarPicker
          items={stars(rest, setRest)}
          label={rest ? LABELS[rest - 1] : ''}
          name="امتیاز به رستوران"
        />
        <h2 className={s.h}>پیک (اختیاری)</h2>
        <StarPicker
          items={stars(courier, setCourier)}
          label={courier ? LABELS[courier - 1] : ''}
          name="امتیاز به پیک"
        />
        <label htmlFor={textId} className={s.label}>
          نظر شما (اختیاری)
        </label>
        <textarea
          id={textId}
          className={s.text}
          maxLength={500}
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
        <Button size="lg" block disabled={!rest || busy} onClick={() => void submit()}>
          ثبت امتیاز
        </Button>
      </div>
    </div>
  );
}
