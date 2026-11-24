import { useEffect, useRef, useState } from 'react';
import { ActionBar } from '@/components/library/ActionBar';
import { ContactRow } from '@/components/library/ContactRow';
import { ErrorState } from '@/components/library/ErrorState';
import { FaqItem } from '@/components/library/FaqItem';
import { LoadingState } from '@/components/library/LoadingState';
import { ToggleRow } from '@/components/library/ToggleRow';
import { TopBar } from '@/components/library/TopBar';
import { acceptAttr, prepareFile, UploadError } from '@/lib/upload';
import { toast } from '@/ui/toast';
import { docRow } from '../../account/docs';
import { useCourierMe } from '../../account/me';
import { courierApi } from '../../api/client';
import { COURIER_DOC_RULE, uploadCourierDocument } from '../../api/documents';
import type { DocType } from '../../api/types';
import { DocStatusRow } from '../../components/DocStatusRow';
import { syncCourierConsent, useCourierConsent } from '../../consent/consent';
import { showFullPageError } from '../../errors/fullPage';
import { useCourierNav } from '../../nav/nav';
import { COURIER_FAQ, SUPPORT_CONTACTS } from '../../support/content';
import s from './account.module.css';

const back = () => useCourierNav.getState().back();

/**
 * «مدارک من» (KAN-101): every document of `GET /c/doc-types` with its state from `Me.docs` (ok / in
 * review / expiring, expired, rejected or never sent). «بارگذاری مجدد» picks a file, shrinks a photo and
 * sends it with `POST /c/documents/{type}`; the row then shows «در حال بررسی».
 */
export function DocsScreen() {
  const me = useCourierMe((st) => st.me);
  const [types, setTypes] = useState<DocType[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const current = useRef<DocType | null>(null);

  // Each retry bumps the attempt, which runs the effect again.
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };
  useEffect(() => {
    let live = true;
    courierApi()
      .GET('/c/doc-types')
      .then(({ data, error }) => {
        if (error !== undefined || !data) throw error ?? new Error('empty doc types');
        if (live) setTypes(data);
      })
      .catch((e: unknown) => {
        if (!live) return;
        setFailed(true);
        showFullPageError(e, retry);
      });
    return () => {
      live = false;
    };
  }, [attempt]);
  useEffect(() => {
    void useCourierMe.getState().load();
  }, []);

  const pick = (doc: DocType) => {
    current.current = doc;
    const el = input.current;
    if (!el) return;
    el.value = '';
    el.click();
  };

  const send = async (doc: DocType, file: File) => {
    if (!doc.id) return;
    setBusy(doc.id);
    try {
      const ready = await prepareFile(file, COURIER_DOC_RULE);
      await uploadCourierDocument(courierApi(), doc.id, ready);
      toast(`${doc.label ?? 'مدرک'} برای بررسی فرستاده شد`, 'info');
      await useCourierMe.getState().load();
    } catch (e) {
      if (e instanceof UploadError) toast(e.message, 'error');
      else if (!showFullPageError(e, () => void send(doc, file)))
        toast('بارگذاری انجام نشد؛ اتصال را بررسی کنید', 'error');
    } finally {
      setBusy(null);
    }
  };

  let body;
  if (types && me) {
    body = (
      <ul className={s.list} aria-label="مدارک">
        {types.map((t) => (
          <li key={t.id} aria-busy={busy === t.id || undefined}>
            <DocStatusRow
              doc={docRow(
                t,
                me.docs?.find((d) => d.type === t.id),
              )}
              onRenew={() => pick(t)}
            />
          </li>
        ))}
      </ul>
    );
  } else if (failed) body = <ErrorState text="فهرست مدارک دریافت نشد." onRetry={retry} />;
  else body = <LoadingState variant="list" rows={4} />;

  return (
    <div className={s.page}>
      <TopBar title="مدارک من" onBack={back} />
      <p className={s.note}>مدارک منقضی‌شده باید تمدید شود، وگرنه امکان دریافت سفارش بسته می‌شود.</p>
      {body}
      <input
        ref={input}
        type="file"
        accept={acceptAttr(COURIER_DOC_RULE)}
        className={s.file}
        tabIndex={-1}
        aria-hidden="true"
        data-testid="doc-file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && current.current) void send(current.current, f);
        }}
      />
    </div>
  );
}

/** «پشتیبانی» (KAN-101): contact rows (when the numbers are set) and the courier FAQ. */
export function SupportScreen() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className={s.page}>
      <TopBar title="پشتیبانی" onBack={back} />
      {SUPPORT_CONTACTS.map((c) => (
        <ContactRow key={c.href} title={c.title} sub={c.sub} art={c.art} href={c.href} />
      ))}
      <h2 className={s.sh}>پرسش‌های پرتکرار</h2>
      {COURIER_FAQ.map((f, i) => (
        <FaqItem key={f.q} q={f.q} a={f.a} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
      ))}
    </div>
  );
}

/**
 * «کوکی‌ها و حریم خصوصی» (KAN-101): essential fixed on, performance and analytics as chosen before
 * (first-visit card, D-128). «ذخیره‌ی انتخاب» keeps it on the device and sends `PUT /c/consent`.
 */
export function CookiesScreen() {
  const saved = useCourierConsent((st) => st.choice);
  const [performance, setPerformance] = useState(saved.performance);
  const [analytics, setAnalytics] = useState(saved.analytics);
  const decided = useCourierConsent((st) => st.decided);
  const changed = !decided || performance !== saved.performance || analytics !== saved.analytics;

  const save = async () => {
    useCourierConsent.getState().decide({ performance, analytics });
    await syncCourierConsent(courierApi());
    toast('انتخاب شما ذخیره شد', 'info');
    back();
  };

  return (
    <div className={s.page}>
      <TopBar title="کوکی‌ها و حریم خصوصی" onBack={back} />
      <p className={s.note}>
        دکون فقط داده‌ای را نگه می‌دارد که برای کار برنامه لازم است. موارد اختیاری را می‌توانید خاموش کنید.
      </p>
      <ToggleRow title="ضروری" sub="ورود به حساب، سفارش فعال و امنیت؛ خاموش نمی‌شود" on disabled />
      <ToggleRow
        title="عملکرد و خطاها"
        sub="گزارش خطا برای بهتر شدن سرعت و پایداری"
        on={performance}
        onFlip={() => setPerformance((v) => !v)}
      />
      <ToggleRow
        title="آمار استفاده"
        sub="آمار گمنام برای بهبود برنامه، بدون نام و شماره"
        on={analytics}
        onFlip={() => setAnalytics((v) => !v)}
      />
      <p className={s.note}>موقعیت مکانی کوکی نیست و جداگانه در «مجوزهای دستگاه» مدیریت می‌شود.</p>
      <ActionBar label="ذخیره‌ی انتخاب" disabled={!changed} onTap={() => void save()} />
    </div>
  );
}
