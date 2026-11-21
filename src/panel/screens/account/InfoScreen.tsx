import { useEffect, useState } from 'react';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { ActionBar } from '@/components/library/ActionBar';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { toFaDigits } from '@/lib/format';
import { toast } from '@/ui/toast';
import { panelApi } from '../../api/client';
import { businessError } from '../../api/errors';
import type { DocType } from '../../api/types';
import { showFullPageError } from '../../errors/fullPage';
import { usePanelNav } from '../../nav/nav';
import { PANEL_TOAST_MS } from '../../shell/openSwitch';
import { useRestaurant } from '../../state/restaurant';
import { UploadError } from '../../upload/upload';
import { DocsUploader } from '../reg/DocsUploader';
import s from './account.module.css';

type Docs = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; list: DocType[] };

/** Documents Dokoon asks for now (newly required, not uploaded yet) come first. */
export const docsOrder = (list: DocType[]) =>
  [...list].sort((a, b) => Number(!!b.required && !b.uploaded) - Number(!!a.required && !a.uploaded));

/**
 * Restaurant info (KAN-70): name and address (`PATCH /r/me`), phone read-only, masked Sheba with
 * «درخواست تغییر شبا» (fresh SMS code + Dokoon review), logo / licence / newly required documents
 * (data-driven from `GET /r/doc-types`, sent with `POST /r/docs`).
 */
export function InfoScreen() {
  const profile = useRestaurant((st) => st.profile);
  const [name, setName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState<Docs>({ kind: 'loading' });
  const [nonce, setNonce] = useState(0);
  const [uploaded, setUploaded] = useState<Record<string, string>>({});
  const nav = usePanelNav.getState;

  useEffect(() => {
    void useRestaurant.getState().load();
  }, []);
  useEffect(() => {
    let alive = true;
    panelApi()
      .GET('/r/doc-types')
      .then(
        ({ data, error }) => {
          if (!alive) return;
          setDocs(
            error !== undefined || !data ? { kind: 'error' } : { kind: 'ready', list: docsOrder(data) },
          );
        },
        (e: unknown) => {
          if (!alive) return;
          setDocs({ kind: 'error' });
          showFullPageError(e, () => setNonce((n) => n + 1));
        },
      );
    return () => {
      alive = false;
    };
  }, [nonce]);

  const curName = name ?? profile?.name ?? '';
  const curAddress = address ?? profile?.address ?? '';
  const nameErr = curName.trim().length < 2 ? 'نام رستوران حداقل ۲ حرف است' : undefined;
  const addrErr = curAddress.trim().length < 8 ? 'آدرس حداقل ۸ حرف است' : undefined;
  const dirty =
    !!profile && (curName.trim() !== (profile.name ?? '') || curAddress.trim() !== (profile.address ?? ''));

  const save = async () => {
    setTouched(true);
    if (nameErr || addrErr || saving || !dirty) return;
    setSaving(true);
    try {
      const { data, error } = await panelApi().PATCH('/r/me', {
        body: { name: curName.trim(), address: curAddress.trim() },
      });
      if (error !== undefined || !data) {
        toast(businessError(error)?.message ?? '', 'error', PANEL_TOAST_MS);
        return;
      }
      useRestaurant.setState({ profile: { ...useRestaurant.getState().profile, ...data } });
      toast('اطلاعات رستوران ذخیره شد', 'success', PANEL_TOAST_MS);
      nav().back();
    } catch (e) {
      if (!showFullPageError(e, () => void save()))
        toast('ذخیره نشد؛ دوباره تلاش کنید', 'error', PANEL_TOAST_MS);
    } finally {
      setSaving(false);
    }
  };

  const attach = async (docTypeId: string, uploadId: string) => {
    const { error } = await panelApi().POST('/r/docs', { body: { docTypeId, uploadId } });
    if (error !== undefined) throw new UploadError('ثبت مدرک انجام نشد؛ دوباره تلاش کنید');
    setUploaded((u) => ({ ...u, [docTypeId]: uploadId }));
  };

  const list = docs.kind === 'ready' ? docs.list : [];
  const missing = list.filter((d) => d.required && !d.uploaded && !(d.id && uploaded[d.id]));

  return (
    <div className={s.wrap}>
      <TopBar title="اطلاعات رستوران" onBack={() => nav().back()} />
      <div className={s.body}>
        {!profile ? (
          useRestaurant.getState().status === 'error' ? (
            <ErrorState text="اطلاعات دریافت نشد." onRetry={() => void useRestaurant.getState().load()} />
          ) : (
            <LoadingState variant="list" rows={3} />
          )
        ) : (
          <>
            <TextField
              label="نام رستوران"
              value={curName}
              maxLength={60}
              error={touched ? nameErr : undefined}
              onChange={setName}
            />
            <TextField
              label="آدرس"
              value={curAddress}
              rows={3}
              maxLength={200}
              error={touched ? addrErr : undefined}
              onChange={setAddress}
            />
            <div className={s.mask}>
              <small>تلفن مدیر</small>
              <b dir="ltr">{toFaDigits(profile.phoneMasked ?? '')}</b>
            </div>
            <div className={s.mask}>
              <small>شماره‌ی شبا (برای تسویه)</small>
              <b dir="ltr">{toFaDigits(profile.shebaMasked ?? '')}</b>
              <small>
                {profile.pendingShebaChange
                  ? 'درخواست تغییر شبا ثبت شده و در حال بررسی دکون است؛ تا تأیید، تسویه به همین شبا واریز می‌شود.'
                  : 'برای امنیت، شبا فقط پنهان نمایش داده می‌شود. تغییر آن کد تأیید پیامکی و بررسی تیم دکون لازم دارد.'}
              </small>
            </div>
            <Button
              variant="secondary"
              disabled={!!profile.pendingShebaChange}
              onClick={() => nav().push('sheba')}
            >
              {profile.pendingShebaChange ? 'تغییر شبا در حال بررسی است' : 'درخواست تغییر شبا'}
            </Button>
          </>
        )}

        <section className={s.section} aria-labelledby="info-docs">
          <h2 id="info-docs" className={s.sh}>
            لوگو، مجوز و مدارک
          </h2>
          {missing.length ? (
            <p className={s.warn} role="status">
              دکون مدرک تازه‌ای لازم دارد: {missing.map((d) => d.label).join('، ')}
            </p>
          ) : null}
          {docs.kind === 'loading' ? <LoadingState variant="list" rows={2} /> : null}
          {docs.kind === 'error' ? (
            <ErrorState text="فهرست مدارک دریافت نشد." onRetry={() => setNonce((n) => n + 1)} />
          ) : null}
          {docs.kind === 'ready' ? (
            <DocsUploader
              docs={list}
              uploaded={{
                ...Object.fromEntries(list.filter((d) => d.uploaded && d.id).map((d) => [d.id!, 'server'])),
                ...uploaded,
              }}
              onUploaded={attach}
            />
          ) : null}
        </section>
      </div>
      <div className={s.dock}>
        <ActionBar label="ذخیره‌ی اطلاعات" disabled={!dirty || saving} onTap={() => void save()} />
      </div>
    </div>
  );
}
