import { useState } from 'react';
import { bootScreen, useLaunch } from '@/auth/flow';
import { Button } from '@/components/base/Button';
import { Art } from '@/components/primitives/Art';
import { toFaDigits } from '@/lib/format';
import { enterBootScreen } from '@/nav/deepLink';
import type { ScreenProps } from '../registry';
import s from './auth.module.css';

/** Onboarding slides (prototype D.onboard; payment text updated: online gateway or cash on delivery). */
export const ONBOARDING = [
  {
    art: 'dk-kebab',
    title: 'غذای محبوبت، دم در خونه‌ات',
    text: 'از بهترین رستوران‌ها و کافه‌های شهرت سفارش بده.',
  },
  {
    art: 'dk-burger',
    title: 'سفارش ساده، پرداخت امن',
    text: 'آنلاین از درگاه امن بانکی بپرداز یا هنگام تحویل نقدی حساب کن.',
  },
  {
    art: 'dk-cafe',
    title: 'وضعیت سفارش را لحظه‌به‌لحظه ببین',
    text: 'از تأیید رستوران تا رسیدن پیک، همه‌چیز را پیگیری کن.',
  },
] as const;

export function OnboardScreen(_: ScreenProps) {
  const [i, setI] = useState(0);
  const last = i === ONBOARDING.length - 1;
  const slide = ONBOARDING[i];

  const finish = () => {
    useLaunch.getState().finishOnboarding();
    enterBootScreen(bootScreen());
  };

  return (
    <div className={s.au}>
      <button type="button" className={s.skip} onClick={finish}>
        رد کردن
      </button>
      <Art src={slide.art} className={s.obArt} />
      <h1 aria-live="polite">{slide.title}</h1>
      <p>{slide.text}</p>
      <div className={s.pager}>
        <span className="visually-hidden">
          {toFaDigits(i + 1)} از {toFaDigits(ONBOARDING.length)}
        </span>
        {ONBOARDING.map((o, n) => (
          <i key={o.art} className={n === i ? s.on : undefined} aria-hidden="true" />
        ))}
      </div>
      <div className={s.foot}>
        <Button size="lg" block onClick={last ? finish : () => setI(i + 1)}>
          {last ? 'شروع کنیم' : 'بعدی'}
        </Button>
      </div>
    </div>
  );
}
