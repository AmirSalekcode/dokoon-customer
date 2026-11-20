import { useEffect, useState } from 'react';
import { Button } from '@/components/base/Button';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { panelApi } from '../../api/client';
import { usePanelSession } from '../../api/session';
import type { DocType, RegistrationStatus, RestaurantStatus } from '../../api/types';
import { enter, logout, type AuthStatus } from '../../auth/flow';
import { showFullPageError } from '../../errors/fullPage';
import { usePanelNav } from '../../nav/nav';
import { AuthHero } from './AuthHero';
import s from './auth.module.css';

type Load =
  { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; status: RegistrationStatus; missing: DocType[] };

const COPY: Record<'pending' | 'needs_docs' | 'rejected', { title: string; text: string; art: string }> = {
  pending: {
    title: 'درخواست شما در حال بررسی است',
    text: 'تیم دکون مدارک را بررسی می‌کند و نتیجه را پیامک می‌کند. معمولاً کمتر از یک روز کاری طول می‌کشد.',
    art: 'dk-cafe',
  },
  needs_docs: {
    title: 'مدرک بیشتری لازم است',
    text: 'برای تأیید رستوران، مدارک زیر را بارگذاری کنید.',
    art: 'dk-all',
  },
  rejected: {
    title: 'درخواست ثبت‌نام تأیید نشد',
    text: 'دلیل را بخوانید و دوباره ثبت‌نام کنید.',
    art: 'dk-kebab',
  },
};

/**
 * Registration status of a restaurant that is not approved yet (KAN-59): pending / needs more
 * documents / rejected with the reason. Always fetched fresh (`GET /r/registration/status`); once the
 * restaurant is approved the manager goes straight to the shift screen.
 */
/** Fresh status; null when the manager was sent on (approved meanwhile / nothing submitted). */
async function fetchRegStatus(): Promise<Load | null> {
  const api = panelApi();
  const { data, error } = await api.GET('/r/registration/status');
  if (error !== undefined || !data?.status) throw error ?? new Error('empty status');
  const status = data.status as AuthStatus;
  const st = usePanelSession.getState();
  if (status !== st.status && st.accessToken && st.refreshToken)
    st.setSession({
      accessToken: st.accessToken,
      refreshToken: st.refreshToken,
      status: status as RestaurantStatus,
    });
  if (status === 'active' || status === 'new') {
    enter(status);
    return null;
  }
  let missing: DocType[] = [];
  const ids = data.missingDocTypeIds ?? [];
  if (status === 'needs_docs' && ids.length) {
    const docs = await api.GET('/r/doc-types');
    missing = (docs.data ?? []).filter((d) => d.id && ids.includes(d.id));
  }
  return { kind: 'ready', status: data, missing };
}

export function RegStatusScreen() {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [nonce, setNonce] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const reload = () => {
    setLoad({ kind: 'loading' });
    setNonce((n) => n + 1);
  };

  useEffect(() => {
    let alive = true;
    fetchRegStatus().then(
      (r) => {
        if (alive && r) setLoad(r);
      },
      (e: unknown) => {
        if (!alive) return;
        setLoad({ kind: 'error' });
        showFullPageError(e, () => {
          setLoad({ kind: 'loading' });
          setNonce((n) => n + 1);
        });
      },
    );
    return () => {
      alive = false;
    };
  }, [nonce]);

  const out = async () => {
    setLeaving(true);
    await logout();
  };

  if (load.kind === 'loading')
    return (
      <div className={s.wrap}>
        <AuthHero tag="وضعیت ثبت‌نام" art="dk-cafe" text="در حال دریافت وضعیت رستوران…" />
        <div className={s.body}>
          <LoadingState variant="list" rows={2} />
        </div>
      </div>
    );
  if (load.kind === 'error')
    return (
      <div className={s.wrap}>
        <div className={s.body}>
          <ErrorState text="وضعیت ثبت‌نام دریافت نشد. دوباره تلاش کنید." onRetry={() => reload()} />
        </div>
      </div>
    );

  const st = load.status.status as keyof typeof COPY;
  const c = COPY[st] ?? COPY.pending;
  return (
    <div className={s.wrap}>
      <AuthHero tag="وضعیت ثبت‌نام" art={c.art} text="رستوران شما هنوز در دکون فعال نشده است." />
      <div className={s.body}>
        <h2>{c.title}</h2>
        <p className={s.lede}>{c.text}</p>
        {st === 'rejected' && load.status.reason ? (
          <p className={s.note} role="note">
            {load.status.reason}
          </p>
        ) : null}
        {st === 'needs_docs' && load.missing.length ? (
          <ul className={s.list} aria-label="مدارک لازم">
            {load.missing.map((d) => (
              <li key={d.id}>{d.label}</li>
            ))}
          </ul>
        ) : null}
        {st === 'rejected' ? (
          <Button size="lg" block onClick={() => usePanelNav.getState().push('reg')}>
            ثبت‌نام دوباره
          </Button>
        ) : (
          <Button size="lg" block variant="secondary" onClick={() => reload()}>
            بررسی دوباره‌ی وضعیت
          </Button>
        )}
        <button type="button" className={s.link} disabled={leaving} onClick={() => void out()}>
          خروج از حساب
        </button>
      </div>
    </div>
  );
}
