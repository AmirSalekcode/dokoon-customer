import { useId, useState } from 'react';
import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { isLoggedIn } from '@/auth/flow';
import { Button } from '@/components/base/Button';
import { ContactRow } from '@/components/library/ContactRow';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { FaqItem } from '@/components/library/FaqItem';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from '../registry';
import s from './more.module.css';

interface Contact {
  title?: string;
  sub?: string;
  href?: string;
}

/** Support (screen-specs §6 support): contacts, FAQ accordion, message to support (login needed to send). */
export function SupportScreen(_: ScreenProps) {
  const { back, push } = useNav.getState();
  const data = useApi(() => unwrap(api.GET('/support/info')), []);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const textId = useId();

  const send = async () => {
    if (!isLoggedIn()) {
      push('login');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { error: err } = await api.POST('/support/messages', { body: { text: text.trim() } });
      if (err !== undefined) {
        setError((err as { message?: string }).message || 'ارسال پیام انجام نشد.');
        return;
      }
      setText('');
      toast('پیام شما ارسال شد', 'success');
    } catch {
      setError('اتصال برقرار نشد. دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  const info = () => {
    if (data.status === 'loading') return <LoadingState variant="list" />;
    if (data.status === 'error') return <ErrorState onRetry={data.reload} />;
    const contacts = ((data.data.contacts ?? []) as Contact[]).filter((c) => c.title && c.href);
    const faqs = (data.data.faqs ?? []).filter((f) => f.q && f.a);
    return (
      <>
        {contacts.map((c) => (
          <ContactRow key={c.href} title={c.title!} sub={c.sub} href={c.href!} />
        ))}
        <h2 className={s.h}>پرسش‌های متداول</h2>
        {faqs.length === 0 ? (
          <EmptyState art="dk-cafe" title="پرسشی ثبت نشده" text="سؤالتان را از بخش ارسال پیام بپرسید." />
        ) : (
          faqs.map((f, i) => (
            <FaqItem
              key={f.q}
              q={f.q!}
              a={f.a!}
              open={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            />
          ))
        )}
      </>
    );
  };

  return (
    <div className={s.page}>
      <TopBar title="پشتیبانی" onBack={() => back()} />
      <div className={s.body}>
        {info()}
        <h2 className={s.h}>ارسال پیام</h2>
        <label htmlFor={textId} className={s.label}>
          پیام شما
        </label>
        <textarea
          id={textId}
          className={s.text}
          maxLength={1000}
          placeholder="مشکل یا پیشنهاد خود را بنویسید"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {error ? (
          <p className={s.alert} role="alert">
            {error}
          </p>
        ) : null}
        <Button size="lg" block loading={busy} disabled={!text.trim()} onClick={() => void send()}>
          ارسال پیام
        </Button>
      </div>
    </div>
  );
}
