import { useEffect, useRef, useState } from 'react';
import { TextField } from '@/components/base/TextField';
import { ActionBar } from '@/components/library/ActionBar';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { MapPicker } from '@/components/library/MapPicker';
import { ToggleRow } from '@/components/library/ToggleRow';
import { TopBar } from '@/components/library/TopBar';
import { WizardBar } from '@/components/library/WizardBar';
import { toast } from '@/ui/toast';
import { panelApi } from '../../api/client';
import { businessError } from '../../api/errors';
import { usePanelSession } from '../../api/session';
import type { DocType } from '../../api/types';
import { signOutLocal } from '../../auth/flow';
import {
  isValidAddress,
  isValidRestaurantName,
  isValidSheba,
  normalizeSheba,
  shebaError,
} from '../../auth/validation';
import { showFullPageError } from '../../errors/fullPage';
import { setPanelBackInterceptor, usePanelNav } from '../../nav/nav';
import { PANEL_TOAST_MS } from '../../shell/openSwitch';
import type { PanelScreenProps } from '../StackScreens';
import { DocsUploader } from './DocsUploader';
import { fromPct, toPct, type LatLng, currentPosition } from './map';
import r from './reg.module.css';

const STEPS = ['اطلاعات', 'مدارک', 'تسویه', 'بررسی'];
const CTA = ['ادامه', 'ادامه', 'ارسال برای بررسی', 'مشاهده‌ی وضعیت ثبت‌نام'];

type Docs = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; list: DocType[] };

/**
 * Restaurant registration wizard (KAN-60, restaurant screen specs §1 `reg`): info (name, address, map
 * pin → coordinates) → documents from `GET /r/doc-types` → Sheba (mod-97 checked) + cash →
 * `POST /r/registration` → «submitted». Back (UI and Android) steps back through the wizard.
 * Runs with the token of the verified phone (D-111), so uploads and the request belong to it.
 */
export function RegScreen({ route }: PanelScreenProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loc, setLoc] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [docs, setDocs] = useState<Docs>({ kind: 'loading' });
  const [docsNonce, setDocsNonce] = useState(0);
  const [uploaded, setUploaded] = useState<Record<string, string>>({});
  const [sheba, setSheba] = useState('');
  const [cash, setCash] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Documents are data-driven; fetched once the wizard opens so step 2 is ready.
  useEffect(() => {
    let alive = true;
    panelApi()
      .GET('/r/doc-types')
      .then(
        ({ data, error: err }) => {
          if (!alive) return;
          if (err !== undefined || !data) setDocs({ kind: 'error' });
          else
            setDocs({
              kind: 'ready',
              list: data.filter((d) => (d.stage ?? 'registration') === 'registration'),
            });
        },
        (e: unknown) => {
          if (!alive) return;
          setDocs({ kind: 'error' });
          showFullPageError(e, () => setDocsNonce((n) => n + 1));
        },
      );
    return () => {
      alive = false;
    };
  }, [docsNonce]);

  const isRoot = () => usePanelNav.getState().stack.length === 1;
  const finish = () => {
    const st = usePanelSession.getState();
    if (st.accessToken && st.refreshToken)
      st.setSession({ accessToken: st.accessToken, refreshToken: st.refreshToken, status: 'pending' });
    usePanelNav.getState().resetTo('reg-status');
  };
  /** One step back; at the first step leave the wizard (root: back to login). */
  const stepBack = (): boolean => {
    const s = stepRef.current;
    if (s === 4) {
      finish();
      return true;
    }
    if (s > 1) {
      setStep(s - 1);
      setError('');
      return true;
    }
    if (isRoot()) {
      signOutLocal();
      return true;
    }
    return false;
  };

  useEffect(() => {
    setPanelBackInterceptor(route.key, stepBack);
    return () => setPanelBackInterceptor(route.key, null);
  }); // re-register every render: the closure reads refs/state setters only

  const required = docs.kind === 'ready' ? docs.list.filter((d) => d.required) : [];
  const canNext =
    step === 1
      ? isValidRestaurantName(name) && isValidAddress(address) && !!loc
      : step === 2
        ? docs.kind === 'ready' && required.every((d) => d.id && uploaded[d.id])
        : step === 3
          ? isValidSheba(sheba)
          : true;

  const submit = async () => {
    if (!loc) return;
    setBusy(true);
    setError('');
    try {
      const { error: err } = await panelApi().POST('/r/registration', {
        body: {
          name: name.trim(),
          address: address.trim(),
          lat: loc.lat,
          lng: loc.lng,
          sheba: normalizeSheba(sheba),
          allowCash: cash,
          docs: Object.entries(uploaded).map(([docTypeId, uploadId]) => ({ docTypeId, uploadId })),
        },
      });
      if (err !== undefined) {
        setError(businessError(err)?.message ?? 'ثبت درخواست انجام نشد');
        return;
      }
      setStep(4);
    } catch (e) {
      if (!showFullPageError(e, () => void submit()))
        setError('ارتباط برقرار نشد. اتصال را بررسی کنید و دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (!canNext || busy) return;
    if (step === 3) void submit();
    else if (step === 4) finish();
    else setStep(step + 1);
  };

  const locate = async () => {
    setLocating(true);
    try {
      setLoc(await currentPosition());
    } catch {
      toast('موقعیت پیدا نشد؛ محل رستوران را روی نقشه بزنید', 'warn', PANEL_TOAST_MS);
    } finally {
      setLocating(false);
    }
  };

  const pin = loc ? toPct(loc) : { x: -1, y: -1 };

  return (
    <div className={r.wrap}>
      <TopBar
        title="ثبت‌نام رستوران"
        onBack={() => {
          if (!stepBack()) usePanelNav.getState().back();
        }}
      />
      <div className={r.body}>
        <WizardBar
          label="مراحل ثبت‌نام"
          steps={STEPS.map((label, i) => ({
            label,
            state: i + 1 < step || step === 4 ? 'done' : i + 1 === step ? 'cur' : 'todo',
          }))}
        />

        {step === 1 ? (
          <>
            <TextField
              label="نام رستوران"
              value={name}
              onChange={setName}
              placeholder="مثلاً کبابی سنتی زاگرس"
              maxLength={60}
              error={name && !isValidRestaurantName(name) ? 'نام حداقل ۲ حرف باشد' : undefined}
            />
            <TextField
              label="آدرس رستوران"
              value={address}
              onChange={setAddress}
              rows={3}
              placeholder="شهر، خیابان، پلاک"
              maxLength={200}
              error={
                address.trim() && !isValidAddress(address) ? 'آدرس کامل‌تر بنویسید (حداقل ۸ حرف)' : undefined
              }
            />
            <p className={r.label}>محل رستوران روی نقشه</p>
            <MapPicker
              pinX={pin.x}
              pinY={pin.y}
              locating={locating}
              label="نقشه برای انتخاب محل رستوران"
              emptyHint="روی نقشه بزنید تا محل رستوران مشخص شود"
              zoneLabel={null}
              onPick={(x, y) => setLoc(fromPct(x, y))}
              onLocate={() => void locate()}
            />
            <p className={r.muted}>
              {loc
                ? 'محل رستوران ثبت شد؛ برای تغییر دوباره روی نقشه بزنید.'
                : 'روی نقشه بزنید یا «موقعیت من» را بزنید.'}
            </p>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className={r.note}>برای تأیید رستوران، این مدارک را بارگذاری کنید.</p>
            {docs.kind === 'loading' ? <LoadingState variant="list" rows={2} /> : null}
            {docs.kind === 'error' ? (
              <ErrorState text="فهرست مدارک دریافت نشد." onRetry={() => setDocsNonce((n) => n + 1)} />
            ) : null}
            {docs.kind === 'ready' ? (
              <DocsUploader
                docs={docs.list}
                uploaded={uploaded}
                onUploaded={(id, up) => setUploaded((u) => ({ ...u, [id]: up }))}
              />
            ) : null}
            <p className={r.muted}>
              فهرست مدارک را دکون تعیین می‌کند. اگر بعداً مدرک تازه‌ای لازم شد، اعلان می‌آید و از «اطلاعات
              رستوران» بارگذاری می‌کنید.
            </p>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <TextField
              label="شماره‌ی شبا (برای تسویه‌حساب)"
              value={sheba}
              onChange={(v) => {
                setSheba(v);
                setError('');
              }}
              placeholder="IR…"
              ltr
              maxLength={34}
              autoComplete="off"
              hint="تسویه فقط به حسابی که به نام مدیر رستوران است انجام می‌شود."
              error={shebaError(sheba)}
            />
            <ToggleRow
              title="پرداخت در محل (نقدی)"
              sub="مشتری می‌تواند هنگام تحویل به پیک نقد بپردازد"
              on={cash}
              onFlip={() => setCash((c) => !c)}
            />
            {error ? (
              <p className={r.error} role="alert">
                {error}
              </p>
            ) : null}
          </>
        ) : null}

        {step === 4 ? (
          <EmptyState
            art="dk-all"
            title="درخواست شما ثبت شد"
            text="تیم دکون مدارک را بررسی می‌کند و نتیجه را پیامک می‌کند. معمولاً کمتر از یک روز کاری طول می‌کشد."
          />
        ) : null}
      </div>
      <div className={r.dock}>
        <ActionBar label={busy ? 'در حال ارسال…' : CTA[step - 1]} disabled={!canNext || busy} onTap={next} />
      </div>
    </div>
  );
}
