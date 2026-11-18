import { useId, useState } from 'react';
import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { useLaunch } from '@/auth/flow';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { TopBar } from '@/components/library/TopBar';
import { Icon } from '@/components/primitives/Icon';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import s from './more.module.css';

type Kind = 'restaurant' | 'courier';

interface Field {
  id: string;
  label: string;
  /** Where the value goes in the request: the contract's `name`, or a key of `extra`. */
  to: 'name' | `extra.${string}`;
  options?: string[];
}

const FORMS: Record<Kind, { title: string; intro: string; fields: Field[] }> = {
  restaurant: {
    title: 'ثبت‌نام رستوران',
    intro: 'رستوران یا کافه‌ی خود را به دکون اضافه کنید تا سفارش آنلاین بگیرید.',
    fields: [
      { id: 'business', label: 'نام رستوران', to: 'extra.business' },
      { id: 'name', label: 'نام مالک', to: 'name' },
      { id: 'address', label: 'آدرس رستوران', to: 'extra.address' },
    ],
  },
  courier: {
    title: 'همکاری با پیک',
    intro: 'با وسیله‌ی نقلیه‌ی خود در ساعت‌های دلخواه سفارش‌های دکون را برسانید.',
    fields: [
      { id: 'name', label: 'نام و نام خانوادگی', to: 'name' },
      {
        id: 'vehicle',
        label: 'نوع وسیله‌ی نقلیه',
        to: 'extra.vehicle',
        options: ['موتورسیکلت', 'خودرو', 'دوچرخه'],
      },
      { id: 'area', label: 'محدوده‌ی فعالیت', to: 'extra.area' },
    ],
  },
};

const PHONE_RE = /^09\d{9}$/;

/**
 * Restaurant / courier application (screen-specs §6 apply). POST /partner-requests (auth optional);
 * fields the contract has no slot for go into `extra`. Success message, then back.
 */
export function ApplyScreen({ route }: ScreenProps) {
  const back = useNav((st) => st.back);
  const kind: Kind = route.params.kind === 'courier' ? 'courier' : 'restaurant';
  const form = FORMS[kind];
  const savedCity = useLaunch((st) => st.cityId);
  const cities = useApi(() => unwrap(api.GET('/cities')), [], { fullPageErrors: false });
  const [values, setValues] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState('');
  const [cityId, setCityId] = useState(savedCity ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const cityFieldId = useId();
  const ids = useId();

  const cityList = (cities.status === 'success' ? cities.data : []).filter(
    (c): c is { id: string; name: string } => !!c.id && !!c.name,
  );
  /** The picked city, else the saved launch city, else the first active one. */
  const city = cityList.some((c) => c.id === cityId) ? cityId : (cityList[0]?.id ?? '');

  const phoneError = phone.length === 11 && !PHONE_RE.test(phone) ? 'شماره نامعتبر است' : undefined;
  const filled = form.fields.every((f) => values[f.id]?.trim());
  const ok = filled && PHONE_RE.test(phone) && !!city && !busy;

  const submit = async () => {
    setBusy(true);
    setError('');
    let name = '';
    const extra: Record<string, string> = {};
    for (const f of form.fields) {
      const v = values[f.id].trim();
      if (f.to === 'name') name = v;
      else extra[f.to.slice('extra.'.length)] = v;
    }
    try {
      const { error: err } = await api.POST('/partner-requests', {
        // The contract types `extra` as a bare object (generated as Record<string, never>), see contract-notes.
        body: { kind, name, phone, cityId: city, extra: extra as Record<string, never> },
      });
      if (err !== undefined) {
        setError((err as { message?: string }).message || 'ثبت درخواست انجام نشد.');
        return;
      }
      setDone(true);
    } catch {
      setError('اتصال برقرار نشد. دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  const set = (id: string) => (v: string) => setValues((prev) => ({ ...prev, [id]: v }));

  return (
    <div className={s.page}>
      <TopBar level={1} title={form.title} onBack={done ? undefined : () => back()} />
      {done ? (
        <div className={s.done}>
          <span className={s.ok}>
            <Icon name="check" size={36} />
          </span>
          <h2>درخواست شما ثبت شد</h2>
          <p className={s.desc}>پس از بررسی و تأیید، همکاران ما با شما در ارتباط خواهند بود.</p>
          <Button size="lg" block onClick={() => back()}>
            بازگشت
          </Button>
        </div>
      ) : (
        <form
          className={s.body}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (ok) void submit();
          }}
        >
          <p className={s.desc}>{form.intro}</p>
          {form.fields.map((f, i) =>
            f.options ? (
              <div key={f.id} className={s.field}>
                <label htmlFor={`${ids}-${f.id}`} className={s.label}>
                  {f.label}
                </label>
                <select
                  id={`${ids}-${f.id}`}
                  className={s.select}
                  value={values[f.id] ?? ''}
                  onChange={(e) => set(f.id)(e.target.value)}
                >
                  <option value="" disabled>
                    انتخاب کنید
                  </option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <TextField
                key={f.id}
                label={f.label}
                value={values[f.id] ?? ''}
                onChange={set(f.id)}
                maxLength={f.id === 'address' ? 300 : 80}
                autoComplete={i === 0 && f.to === 'name' ? 'name' : undefined}
              />
            ),
          )}
          <TextField
            label="شماره‌ی تماس"
            numeric
            maxDigits={11}
            type="tel"
            autoComplete="tel"
            placeholder="۰۹۱۲۳۴۵۶۷۸۹"
            value={phone}
            onChange={setPhone}
            error={phoneError}
          />
          <div className={s.field}>
            <label htmlFor={cityFieldId} className={s.label}>
              شهر
            </label>
            <select
              id={cityFieldId}
              className={s.select}
              value={city}
              disabled={!cityList.length}
              onChange={(e) => setCityId(e.target.value)}
            >
              {cityList.length ? null : (
                <option value="">{cities.status === 'error' ? 'بارگذاری نشد' : '…'}</option>
              )}
              {cityList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {cities.status === 'error' ? (
            <Button variant="ghost" onClick={cities.reload}>
              تلاش دوباره برای فهرست شهرها
            </Button>
          ) : null}
          {error ? (
            <p className={s.alert} role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" block loading={busy} disabled={!ok}>
            ثبت درخواست
          </Button>
        </form>
      )}
    </div>
  );
}
