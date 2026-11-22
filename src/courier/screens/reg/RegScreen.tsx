import { useEffect, useRef, useState } from 'react';
import { TextField } from '@/components/base/TextField';
import { ActionBar } from '@/components/library/ActionBar';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { WizardBar } from '@/components/library/WizardBar';
import { normalizeDigits } from '@/lib/format';
import {
  isValidNationalId,
  isValidSheba,
  nationalIdError,
  normalizeNationalId,
  normalizeSheba,
  shebaError,
} from '@/lib/validation';
import { courierApi } from '../../api/client';
import { businessError } from '../../api/errors';
import { useCourierSession } from '../../api/session';
import type { DocType } from '../../api/types';
import { enter, signOutToLogin } from '../../auth/flow';
import { showFullPageError } from '../../errors/fullPage';
import { setCourierBackInterceptor } from '../../nav/nav';
import type { CourierScreenProps } from '../types';
import { DocsUploader } from './DocsUploader';
import r from './reg.module.css';

const STEPS = ['اطلاعات', 'مدارک', 'شبا', 'ثبت'];
const CTA = ['ادامه', 'ادامه', 'ارسال برای بررسی', 'مشاهده‌ی وضعیت ثبت‌نام'];
const NETWORK_TEXT = 'ارتباط برقرار نشد. اتصال را بررسی کنید و دوباره تلاش کنید.';

/** Same rules as the server (mock) so the courier rarely meets a 422; the server checks again. */
export const isValidCourierName = (v: string) => v.trim().length >= 3;
export const normalizePlate = (v: string) => normalizeDigits(v).replace(/\s+/g, ' ').trim();
export const isValidPlate = (v: string) => normalizePlate(v).length >= 5;

type Field = 'name' | 'nationalId' | 'plate' | 'sheba';
/** Step that holds each field (a 422 opens the first one with an error). */
const STEP_OF: Record<Field, number> = { name: 1, nationalId: 1, plate: 1, sheba: 3 };

type Docs = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; list: DocType[] };

/**
 * Courier registration (KAN-91, courier screen specs «ثبت‌نام»): details (name, national code, plate) →
 * documents from `GET /c/doc-types`, each sent at once with `POST /c/documents/{type}` → Sheba →
 * `POST /c/registration` → «submitted» → the waiting page. Runs with the session of the verified phone
 * (contract-notes 31). Back (UI and Android) steps back through the wizard; at the first step it leaves
 * to the login page.
 */
export function RegScreen({ route }: CourierScreenProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [nid, setNid] = useState('');
  const [plate, setPlate] = useState('');
  const [sheba, setSheba] = useState('');
  const [docs, setDocs] = useState<Docs>({ kind: 'loading' });
  const [docsNonce, setDocsNonce] = useState(0);
  const [uploaded, setUploaded] = useState<ReadonlySet<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Documents are data-driven; fetched when the wizard opens so step 2 is ready.
  useEffect(() => {
    let alive = true;
    courierApi()
      .GET('/c/doc-types')
      .then(
        ({ data, error: err }) => {
          if (!alive) return;
          setDocs(err !== undefined || !data ? { kind: 'error' } : { kind: 'ready', list: data });
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

  const finish = () => {
    useCourierSession.getState().setStatus('pending');
    void enter('pending');
  };

  /** One step back; at the first step leave the wizard (back to login). */
  const stepBack = (): boolean => {
    const s = stepRef.current;
    if (s === 4) finish();
    else if (s > 1) {
      setStep(s - 1);
      setError('');
    } else signOutToLogin();
    return true;
  };

  useEffect(() => {
    setCourierBackInterceptor(route.key, stepBack);
    return () => setCourierBackInterceptor(route.key, null);
  }); // re-register every render: the closure reads refs and state setters only

  const fieldError = (f: Field, local: string | undefined) => fieldErrors[f] ?? local;
  const edit = (f: Field, set: (v: string) => void) => (v: string) => {
    set(v);
    setError('');
    if (fieldErrors[f])
      setFieldErrors((prev) => {
        const nextErrors = { ...prev };
        delete nextErrors[f];
        return nextErrors;
      });
  };

  const required = docs.kind === 'ready' ? docs.list.filter((d) => d.required) : [];
  const canNext =
    step === 1
      ? isValidCourierName(name) && isValidNationalId(nid) && isValidPlate(plate) &&
        !fieldErrors.name &&
        !fieldErrors.nationalId &&
        !fieldErrors.plate
      : step === 2
        ? docs.kind === 'ready' && required.every((d) => d.id && uploaded.has(d.id))
        : step === 3
          ? isValidSheba(sheba) && !fieldErrors.sheba
          : true;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const { error: err, response } = await courierApi().POST('/c/registration', {
        body: {
          name: name.trim(),
          nationalId: normalizeNationalId(nid),
          plate: normalizePlate(plate),
          sheba: normalizeSheba(sheba),
        },
      });
      if (err !== undefined || !response.ok) {
        const be = businessError(err);
        const fields = (be?.fields ?? {}) as Partial<Record<Field, string>>;
        const bad = (Object.keys(fields) as Field[]).filter((f) => f in STEP_OF);
        if (response.status === 422 && bad.length) {
          setFieldErrors(fields);
          setStep(Math.min(...bad.map((f) => STEP_OF[f])));
        }
        setError(be?.message ?? 'ثبت درخواست انجام نشد');
        return;
      }
      setStep(4);
    } catch (e) {
      if (!showFullPageError(e, () => void submit())) setError(NETWORK_TEXT);
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (!canNext || busy) return;
    if (step === 3) void submit();
    else if (step === 4) finish();
    else {
      setError('');
      setStep(step + 1);
    }
  };

  return (
    <div className={r.wrap}>
      <TopBar title="ثبت‌نام پیک" onBack={() => void stepBack()} />
      <div className={r.body}>
        <WizardBar
          label="مراحل ثبت‌نام"
          steps={STEPS.map((label, i) => ({
            label,
            state: i + 1 < step || step === 4 ? 'done' : i + 1 === step ? 'cur' : 'todo',
          }))}
        />

        {error && step !== 4 ? (
          <p className={r.error} role="alert">
            {error}
          </p>
        ) : null}

        {step === 1 ? (
          <>
            <TextField
              label="نام و نام خانوادگی"
              value={name}
              onChange={edit('name', setName)}
              placeholder="مثلاً مهدی کریمی"
              maxLength={60}
              autoComplete="name"
              error={fieldError(
                'name',
                name && !isValidCourierName(name) ? 'نام و نام خانوادگی را کامل بنویسید' : undefined,
              )}
            />
            <TextField
              label="کد ملی"
              value={nid}
              onChange={edit('nationalId', setNid)}
              numeric
              maxDigits={10}
              inputMode="numeric"
              placeholder="۱۰ رقم"
              autoComplete="off"
              error={fieldError('nationalId', nationalIdError(nid))}
            />
            <TextField
              label="پلاک موتورسیکلت"
              value={plate}
              onChange={edit('plate', setPlate)}
              placeholder="مثلاً ۱۲۳ ۴۵۶۷۸"
              ltr
              maxLength={20}
              autoComplete="off"
              hint="همان‌طور که روی پلاک نوشته شده است."
              error={fieldError(
                'plate',
                plate.trim() && !isValidPlate(plate) ? 'پلاک موتور را کامل بنویسید' : undefined,
              )}
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className={r.note}>این مدارک را بارگذاری کنید. عکس‌ها باید واضح و کامل باشد.</p>
            {docs.kind === 'loading' ? <LoadingState variant="list" rows={2} /> : null}
            {docs.kind === 'error' ? (
              <ErrorState text="فهرست مدارک دریافت نشد." onRetry={() => setDocsNonce((n) => n + 1)} />
            ) : null}
            {docs.kind === 'ready' ? (
              <DocsUploader
                docs={docs.list}
                uploaded={uploaded}
                onUploaded={(t) => setUploaded((u) => new Set(u).add(t))}
              />
            ) : null}
            <p className={r.muted}>
              فهرست مدارک را دکون تعیین می‌کند. اگر بعداً مدرک تازه‌ای لازم شد، برای شما اعلان می‌آید و از
              «مدارک من» بارگذاری می‌کنید.
            </p>
          </>
        ) : null}

        {step === 3 ? (
          <TextField
            label="شماره‌ی شبا (برای تسویه‌حساب)"
            value={sheba}
            onChange={edit('sheba', setSheba)}
            placeholder="IR…"
            ltr
            maxLength={34}
            autoComplete="off"
            hint="تسویه فقط به حسابی که به نام خودتان است انجام می‌شود."
            error={fieldError('sheba', shebaError(sheba))}
          />
        ) : null}

        {step === 4 ? (
          <EmptyState
            art="dk-fries"
            title="درخواست شما ثبت شد"
            text="مدیر شهر مدارک را بررسی می‌کند و نتیجه را پیامک می‌کند. معمولاً کمتر از یک روز کاری طول می‌کشد."
          />
        ) : null}
      </div>
      <div className={r.dock}>
        <ActionBar label={busy ? 'در حال ارسال…' : CTA[step - 1]} disabled={!canNext || busy} onTap={next} />
      </div>
    </div>
  );
}
