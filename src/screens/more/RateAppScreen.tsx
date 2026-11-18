import { useId, useState } from 'react';
import { api } from '@/api/client';
import { isLoggedIn } from '@/auth/flow';
import { Button } from '@/components/base/Button';
import { StarPicker } from '@/components/library/StarPicker';
import { TopBar } from '@/components/library/TopBar';
import { Icon } from '@/components/primitives/Icon';
import { toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import s from './more.module.css';

const LABELS = ['خیلی بد', 'بد', 'معمولی', 'خوب', 'عالی'];

/**
 * Rate the app (screen-specs §6 rateapp). There is no dedicated endpoint yet, so the rating is sent
 * to support as a message (POST /support/messages). Store links (Bazaar/Myket/Play) are still open.
 */
export function RateAppScreen(_: ScreenProps) {
  const { back, push } = useNav.getState();
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const textId = useId();

  const submit = async () => {
    if (!isLoggedIn()) {
      push('login');
      return;
    }
    setBusy(true);
    setError('');
    const lines = [`امتیاز به اپ: ${toFaDigits(stars)} از ${toFaDigits(5)}`];
    if (text.trim()) lines.push(text.trim());
    try {
      const { error: err } = await api.POST('/support/messages', { body: { text: lines.join('\n') } });
      if (err !== undefined) {
        setError((err as { message?: string }).message || 'ثبت امتیاز انجام نشد.');
        return;
      }
      setDone(true);
    } catch {
      setError('اتصال برقرار نشد. دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.page}>
      <TopBar title="امتیاز به دکون" onBack={() => back()} />
      {done ? (
        <div className={s.done}>
          <span className={s.ok}>
            <Icon name="check" size={36} />
          </span>
          <h2>ممنون از امتیاز شما</h2>
          <p className={s.desc}>نظر شما به بهتر شدن دکون کمک می‌کند.</p>
          <Button size="lg" block onClick={() => back()}>
            بازگشت
          </Button>
        </div>
      ) : (
        <div className={s.body}>
          <p className={s.desc}>از کار با دکون چقدر راضی بودید؟</p>
          <StarPicker
            name="امتیاز به دکون"
            label={stars ? LABELS[stars - 1] : ''}
            items={[1, 2, 3, 4, 5].map((n) => ({
              label: `${toFaDigits(n)} ستاره`,
              on: n <= stars,
              onPick: () => setStars(n),
            }))}
          />
          <label htmlFor={textId} className={s.label}>
            نظر یا پیشنهاد شما (اختیاری)
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
          <Button size="lg" block loading={busy} disabled={!stars} onClick={() => void submit()}>
            ثبت امتیاز
          </Button>
        </div>
      )}
    </div>
  );
}
