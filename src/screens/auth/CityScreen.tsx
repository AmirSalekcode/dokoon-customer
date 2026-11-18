import { useState } from 'react';
import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { useLaunch } from '@/auth/flow';
import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { SelectCard } from '@/components/library/SelectCard';
import { TopBar } from '@/components/library/TopBar';
import { ICONS } from '@/components/primitives/Icon';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from '../registry';
import s from './auth.module.css';

const OUT_OF_ZONE = 'دکون هنوز در موقعیت شما فعال نیست. شهر را از فهرست انتخاب کنید.';

function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { timeout: 10000, maximumAge: 60000 },
    );
  });
}

/** City selection: launch flow (after onboarding) or from settings (has back, returns there). */
export function CityScreen({ route }: ScreenProps) {
  const fromSettings = route.params.from === 'settings';
  const saved = useLaunch((st) => st.cityId);
  const [picked, setPicked] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const cities = useApi(() => unwrap(api.GET('/cities')), []);

  const list = cities.status === 'success' ? cities.data : [];
  const only = list.length === 1 ? list[0].id! : null;
  const selected = picked ?? saved ?? only;

  const confirm = () => {
    if (!selected) return;
    useLaunch.getState().setCity(selected);
    if (fromSettings) useNav.getState().back();
    else useNav.getState().setTop('home');
  };

  const locate = async () => {
    setLocating(true);
    try {
      const { lat, lng } = await currentPosition();
      const { data } = await api.GET('/geo/zone-check', { params: { query: { lat, lng } } });
      if (data?.inZone && data.cityId && list.some((c) => c.id === data.cityId)) setPicked(data.cityId);
      else toast(OUT_OF_ZONE);
    } catch {
      toast('دسترسی به موقعیت ممکن نشد. شهر را از فهرست انتخاب کنید.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <div>
      <TopBar title="انتخاب شهر" onBack={fromSettings ? () => useNav.getState().back() : undefined} />
      <p className={s.desc}>شهر خود را انتخاب کنید تا رستوران‌های همان شهر را ببینید.</p>
      {cities.status === 'loading' ? <LoadingState variant="list" rows={2} /> : null}
      {cities.status === 'error' ? <ErrorState onRetry={cities.reload} /> : null}
      {cities.status === 'success' && list.length === 0 ? (
        <EmptyState title="هنوز شهری فعال نیست" text="به‌زودی در شهر شما هم فعال می‌شویم." />
      ) : null}
      {list.length > 0 ? (
        <>
          <div className={s.list} role="radiogroup" aria-label="شهر">
            {list.map((c) => (
              <SelectCard
                key={c.id}
                title={c.name ?? ''}
                icon={ICONS.pin}
                radio
                selected={selected === c.id}
                onPick={() => setPicked(c.id!)}
              />
            ))}
          </div>
          <div className={s.actions}>
            <Button variant="secondary" icon="locate" loading={locating} onClick={() => void locate()}>
              {locating ? 'در حال یافتن موقعیت…' : 'تشخیص خودکار با موقعیت من'}
            </Button>
            <Button size="lg" block disabled={!selected} onClick={confirm}>
              تأیید و ادامه
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
