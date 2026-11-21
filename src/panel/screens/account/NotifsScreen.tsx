import { useEffect, useState } from 'react';
import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { ListRow } from '@/components/library/ListRow';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { toFaDigits } from '@/lib/format';
import { toast } from '@/ui/toast';
import { usePanelNav } from '../../nav/nav';
import { enablePanelPush, panelPushState, type PanelPushResult } from '../../push/panelPush';
import { PANEL_TOAST_MS } from '../../shell/openSwitch';
import { unreadCount, useNotifs } from '../../state/notifs';
import s from './account.module.css';

const D_BELL = 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4';
const dateFmt = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' });
const when = (iso?: string) => {
  const t = Date.parse(iso ?? '');
  return Number.isNaN(t) ? '' : dateFmt.format(t);
};

const PUSH_TEXT: Record<PanelPushResult | 'off', string> = {
  on: 'اعلان روی این دستگاه فعال است.',
  off: 'وقتی پنل بسته است هم پیام‌های دکون را دریافت کنید.',
  denied: 'اجازه‌ی اعلان در تنظیمات مرورگر بسته است؛ از همان‌جا اجازه دهید.',
  unsupported: 'این مرورگر اعلان پس‌زمینه ندارد؛ پیام‌ها همین‌جا نمایش داده می‌شوند.',
  error: 'فعال‌سازی اعلان انجام نشد؛ دوباره تلاش کنید.',
};

/**
 * Dokoon's messages (KAN-70): list (dot = unread), tap marks one read, «خواندن همه», empty state, and
 * background notifications for this device through the PushProvider (D-98).
 */
export function NotifsScreen() {
  const list = useNotifs((st) => st.list);
  const status = useNotifs((st) => st.status);
  const [push, setPush] = useState<PanelPushResult | 'off' | null>(null);
  const [asking, setAsking] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    void useNotifs.getState().load();
    let alive = true;
    void panelPushState().then((p) => alive && setPush(p));
    return () => {
      alive = false;
    };
  }, []);

  const unread = unreadCount(list);
  const nav = usePanelNav.getState;

  const enable = async () => {
    setAsking(true);
    const r = await enablePanelPush();
    setAsking(false);
    setPush(r);
    if (r === 'on') toast('اعلان روی این دستگاه فعال شد', 'success', PANEL_TOAST_MS);
  };

  return (
    <div className={s.wrap}>
      <TopBar
        title="اعلان‌ها"
        actionLabel={unread ? 'خواندن همه' : undefined}
        onBack={() => nav().back()}
        onAction={() => void useNotifs.getState().markRead()}
      />
      <div className={s.body}>
        {push && push !== 'unsupported' ? (
          <div className={s.pushCard}>
            <p>{PUSH_TEXT[push]}</p>
            {push === 'off' || push === 'error' ? (
              <Button size="md" loading={asking} onClick={() => void enable()}>
                فعال‌سازی اعلان
              </Button>
            ) : null}
          </div>
        ) : null}
        {!list && status === 'error' ? (
          <ErrorState text="اعلان‌ها دریافت نشد." onRetry={() => void useNotifs.getState().load()} />
        ) : null}
        {!list && status !== 'error' ? <LoadingState variant="list" rows={3} /> : null}
        {list && !list.length ? (
          <EmptyState
            art="dk-all"
            title="اعلانی نیست"
            text="پیام‌های دکون برای رستوران اینجا نمایش داده می‌شود."
          />
        ) : null}
        {list?.length ? (
          <>
            {unread ? <p className={s.note}>{toFaDigits(unread)} پیام خوانده‌نشده</p> : null}
            <div className={s.card}>
              {list.map((n) => (
                <ListRow
                  key={n.id}
                  title={n.title ?? ''}
                  sub={open === n.id ? toFaDigits(n.text ?? '') : toFaDigits(n.text ?? '').slice(0, 60)}
                  meta={when(n.createdAt)}
                  d={D_BELL}
                  dot={!!n.unread}
                  onTap={() => {
                    setOpen((o) => (o === n.id ? null : (n.id ?? null)));
                    if (n.unread && n.id) void useNotifs.getState().markRead([n.id]);
                  }}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
