import { useState } from 'react';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { ActionBar } from '@/components/library/ActionBar';
import { ContactRow } from '@/components/library/ContactRow';
import { FaqItem } from '@/components/library/FaqItem';
import { FilterChip } from '@/components/library/FilterChip';
import { TopBar } from '@/components/library/TopBar';
import { toFaDigits } from '@/lib/format';
import { toast } from '@/ui/toast';
import { panelApi } from '../../api/client';
import { businessError } from '../../api/errors';
import { showFullPageError } from '../../errors/fullPage';
import { usePanelNav } from '../../nav/nav';
import { PANEL_TOAST_MS } from '../../shell/openSwitch';
import {
  PANEL_FAQ,
  SUPPORT_PHONE,
  TICKET_CATEGORIES,
  TICKET_MIN,
  type TicketCategory,
} from '../../support/content';
import s from './account.module.css';

/** Help & support (KAN-70): FAQ, «ارسال پیام به پشتیبانی», phone (when set). */
export function HelpScreen() {
  const [open, setOpen] = useState<number | null>(null);
  const nav = usePanelNav.getState;
  return (
    <div className={s.wrap}>
      <TopBar title="راهنما و پشتیبانی" level={1} onBack={() => nav().back()} />
      <div className={s.body}>
        <h2 className={s.sh}>پرسش‌های پرتکرار</h2>
        {PANEL_FAQ.map((f, i) => (
          <FaqItem
            key={f.q}
            q={f.q}
            a={f.a}
            open={open === i}
            onToggle={() => setOpen(open === i ? null : i)}
          />
        ))}
        <Button block onClick={() => nav().push('ticket')}>
          ارسال پیام به پشتیبانی
        </Button>
        <p className={s.note}>پاسخ پیام‌ها در «اعلان‌ها» می‌آید.</p>
        {SUPPORT_PHONE ? (
          <ContactRow
            title="تماس با پشتیبانی رستوران‌ها"
            sub={SUPPORT_PHONE.text}
            art="dk-cafe"
            href={SUPPORT_PHONE.href}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Support message (KAN-70): subject + text ≥ 10 → `POST /r/support/messages`. */
export function TicketScreen() {
  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const nav = usePanelNav.getState;
  const len = text.trim().length;
  const ok = !!category && len >= TICKET_MIN;

  const send = async () => {
    setTouched(true);
    if (!ok || sending) return;
    setSending(true);
    try {
      const { error } = await panelApi().POST('/r/support/messages', {
        body: { category: category!, text: text.trim() },
      });
      if (error !== undefined) {
        toast(businessError(error)?.message ?? '', 'error', PANEL_TOAST_MS);
        return;
      }
      toast('پیام شما فرستاده شد؛ پاسخ در اعلان‌ها می‌آید', 'success', PANEL_TOAST_MS);
      nav().back();
    } catch (e) {
      if (!showFullPageError(e, () => void send()))
        toast('پیام فرستاده نشد؛ دوباره تلاش کنید', 'error', PANEL_TOAST_MS);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={s.wrap}>
      <TopBar title="ارسال پیام به پشتیبانی" onBack={() => nav().back()} />
      <div className={s.body}>
        <section className={s.section} aria-labelledby="tk-cat">
          <h2 id="tk-cat" className={s.sh}>
            موضوع
          </h2>
          <div className={s.chips}>
            {TICKET_CATEGORIES.map((c) => (
              <FilterChip
                key={c.key}
                label={c.label}
                selected={category === c.key}
                onPick={() => setCategory(c.key)}
              />
            ))}
          </div>
          {touched && !category ? <p className={s.err}>موضوع پیام را انتخاب کنید</p> : null}
        </section>
        <TextField
          label="توضیح مشکل یا درخواست"
          value={text}
          rows={5}
          maxLength={1000}
          placeholder="هرچه دقیق‌تر بنویسید، سریع‌تر پاسخ می‌گیرید"
          hint={len < TICKET_MIN ? `حداقل ${toFaDigits(TICKET_MIN)} حرف` : `${toFaDigits(len)} حرف`}
          error={touched && len < TICKET_MIN ? `حداقل ${toFaDigits(TICKET_MIN)} حرف بنویسید` : undefined}
          onChange={setText}
        />
      </div>
      <div className={s.dock}>
        <ActionBar label="ارسال پیام" disabled={sending} onTap={() => void send()} />
      </div>
    </div>
  );
}
