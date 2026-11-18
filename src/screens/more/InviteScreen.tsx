import { useState } from 'react';
import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { useSession } from '@/auth/session';
import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { Art } from '@/components/primitives/Art';
import { toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from '../registry';
import s from './more.module.css';

const STEPS = [
  { title: 'کد دعوت را بفرست', sub: 'کد خود را برای دوستانت بفرست' },
  { title: 'دوستت ثبت‌نام کند', sub: 'هنگام ثبت‌نام کد تو را وارد کند' },
  { title: 'هر دو هدیه بگیرید', sub: 'بعد از اولین سفارش، کد تخفیف فعال می‌شود' },
];

async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Invite friends (screen-specs §6 invite): personal code from GET /me/invite, copy and share. */
export function InviteScreen(_: ScreenProps) {
  const back = useNav((st) => st.back);
  const loggedIn = useSession((st) => !!st.accessToken);
  return (
    <div className={s.page}>
      <TopBar title="دعوت از دوستان" onBack={() => back()} />
      <div className={s.body}>
        {loggedIn ? (
          <InviteCode />
        ) : (
          <EmptyState
            art="dk-cake"
            title="کد دعوت مخصوص شما"
            text="برای دریافت کد دعوت وارد حساب خود شوید."
            action={
              <Button size="lg" onClick={() => useNav.getState().push('login')}>
                ورود یا ثبت‌نام
              </Button>
            }
          />
        )}
        <h2 className={s.h}>چطور کار می‌کند؟</h2>
        <ol className={s.steps}>
          {STEPS.map((st, i) => (
            <li key={st.title} className={s.step}>
              <span className={s.num} aria-hidden="true">
                {toFaDigits(i + 1)}
              </span>
              <span className={s.stepText}>
                <b>{st.title}</b>
                <small>{st.sub}</small>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function InviteCode() {
  const data = useApi(() => unwrap(api.GET('/me/invite')), []);
  const [copied, setCopied] = useState(false);

  if (data.status === 'loading') return <LoadingState variant="list" />;
  if (data.status === 'error') return <ErrorState onRetry={data.reload} />;
  const { code, link, text } = data.data;
  if (!code)
    return <EmptyState art="dk-cake" title="کد دعوت هنوز آماده نیست" text="کمی بعد دوباره سر بزنید." />;

  const copy = async () => {
    if (await copyText(code)) setCopied(true);
    else toast('کپی انجام نشد؛ کد را دستی یادداشت کنید');
  };

  const share = async () => {
    const payload = { title: 'دکون', text: text ?? code, url: link ?? undefined };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(payload);
      } catch {
        /* user closed the share sheet */
      }
      return;
    }
    if (await copyText([text, link].filter(Boolean).join('\n') || code)) toast('متن دعوت کپی شد');
    else toast('اشتراک‌گذاری در این دستگاه ممکن نیست');
  };

  return (
    <section className={s.card}>
      <Art src="dk-cake" className={s.cardArt} />
      <h2>دوستانت را به دکون دعوت کن</h2>
      <p className={s.desc}>
        هر دوست که با کد تو ثبت‌نام کند و اولین سفارشش را بدهد، هر دوی شما کد تخفیف می‌گیرید.
      </p>
      <div className={s.code} dir="ltr">
        {code}
      </div>
      <div className={s.acts}>
        <Button block variant="secondary" icon={copied ? 'check' : undefined} onClick={() => void copy()}>
          {copied ? 'کپی شد' : 'کپی کد دعوت'}
        </Button>
        <Button block icon="share" onClick={() => void share()}>
          ارسال برای دوستان
        </Button>
      </div>
    </section>
  );
}
