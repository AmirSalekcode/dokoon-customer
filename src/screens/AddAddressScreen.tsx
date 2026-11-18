import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { LatLng } from '@/api/types';
import { useSession } from '@/auth/session';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { FilterChip } from '@/components/library/FilterChip';
import { MapPicker } from '@/components/library/MapPicker';
import { TopBar } from '@/components/library/TopBar';
import { config, type MapId } from '@/config/env';
import { useAddresses } from '@/features/addresses';
import { isValidPhone, normalizePhone } from '@/lib/format';
import { readJson, writeJson } from '@/lib/storage';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from './registry';
import s from './cart/cart.module.css';
import c from './cart/checkout.module.css';
import a from './cart/addaddr.module.css';

/** Fallback map center (Shahreza) when the city list is unavailable. */
const DEFAULT_CENTER: LatLng = { lat: 32.0089, lng: 51.8668 };
/** The illustrated placeholder map spans ±SPAN/2 degrees around the city center. */
const SPAN = 0.08;
const TITLES = ['خانه', 'محل کار', 'سایر'];
const MAPS: { id: MapId; title: string }[] = [
  { id: 'neshan', title: 'نشان' },
  { id: 'balad', title: 'بلد' },
];

const toPct = (p: LatLng, center: LatLng) => ({
  x: Math.min(100, Math.max(0, 50 + ((p.lng - center.lng) / SPAN) * 100)),
  y: Math.min(100, Math.max(0, 50 - ((p.lat - center.lat) / SPAN) * 100)),
});
const fromPct = (x: number, y: number, center: LatLng): LatLng => ({
  lat: +(center.lat + ((50 - y) / 100) * SPAN).toFixed(6),
  lng: +(center.lng + ((x - 50) / 100) * SPAN).toFixed(6),
});

function currentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { timeout: 10000, maximumAge: 60000 },
    );
  });
}

/** New delivery address (screen-specs §3 addaddr): map pin + zone check, details, recipient. */
export function AddAddressScreen(_: ScreenProps) {
  const back = useNav((st) => st.back);
  const user = useSession((st) => st.user);
  const [mapId, setMapId] = useState<MapId>(() => readJson<MapId>('dk-map', config.defaultMap));
  const [center] = useState<LatLng>(DEFAULT_CENTER);
  const [loc, setLoc] = useState<LatLng>(DEFAULT_CENTER);
  const [zone, setZone] = useState<{ at: string; inZone: boolean } | null>(null);
  const [locating, setLocating] = useState(false);
  const [title, setTitle] = useState(TITLES[0]);
  const [fullText, setFullText] = useState('');
  const [plaque, setPlaque] = useState('');
  const [unit, setUnit] = useState('');
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const locKey = `${loc.lat},${loc.lng}`;
  useEffect(() => {
    let alive = true;
    api
      .GET('/geo/zone-check', { params: { query: { lat: loc.lat, lng: loc.lng } } })
      .then(({ data }) => alive && setZone({ at: locKey, inZone: !!data?.inZone }))
      .catch(() => alive && setZone({ at: locKey, inZone: false }));
    return () => {
      alive = false;
    };
  }, [loc.lat, loc.lng, locKey]);

  const zoneKnown = zone?.at === locKey;
  const inZone = zoneKnown ? zone.inZone : true;
  const phoneErr = phone && !isValidPhone(phone) ? 'شماره موبایل معتبر نیست' : undefined;
  const canSave =
    zoneKnown &&
    zone.inZone &&
    fullText.trim().length >= 5 &&
    name.trim().length > 1 &&
    isValidPhone(phone) &&
    !busy;
  const pin = toPct(loc, center);

  const pickMap = (id: MapId) => {
    setMapId(id);
    writeJson('dk-map', id);
  };

  const locate = async () => {
    setLocating(true);
    try {
      setLoc(await currentPosition());
    } catch {
      setError('دسترسی به موقعیت ممکن نشد؛ محل را روی نقشه مشخص کنید.');
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError('');
    const r = await useAddresses.getState().add({
      title,
      fullText: fullText.trim(),
      ...(plaque ? { plaque } : {}),
      ...(unit ? { unit } : {}),
      location: loc,
      recipientName: name.trim(),
      recipientPhone: normalizePhone(phone),
    });
    setBusy(false);
    if (r.ok) back();
    else setError(r.message);
  };

  return (
    <div className={s.pageNoNav}>
      <TopBar title="افزودن آدرس" onBack={() => back()} />
      <div className={s.body}>
        <div role="radiogroup" aria-label="سرویس نقشه" className={a.maps}>
          {MAPS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mapId === m.id}
              className={[a.map, mapId === m.id && a.on].filter(Boolean).join(' ')}
              onClick={() => pickMap(m.id)}
            >
              {m.title}
            </button>
          ))}
        </div>
        <MapPicker
          pinX={pin.x}
          pinY={pin.y}
          inZone={inZone}
          locating={locating}
          providerTitle={MAPS.find((m) => m.id === mapId)?.title}
          onPick={(x, y) => setLoc(fromPct(x, y, center))}
          onLocate={() => void locate()}
        />
        <div className={c.block}>
          <div className={a.titles} role="group" aria-label="عنوان آدرس">
            {TITLES.map((t) => (
              <FilterChip key={t} label={t} selected={title === t} onPick={() => setTitle(t)} />
            ))}
          </div>
          <TextField label="آدرس کامل" value={fullText} onChange={setFullText} maxLength={200} />
          <div className={a.row}>
            <TextField label="پلاک" value={plaque} onChange={setPlaque} numeric maxDigits={5} />
            <TextField label="واحد" value={unit} onChange={setUnit} numeric maxDigits={4} />
          </div>
          <TextField label="نام گیرنده" value={name} onChange={setName} autoComplete="name" />
          <TextField
            label="موبایل گیرنده"
            value={phone}
            onChange={setPhone}
            numeric
            maxDigits={11}
            autoComplete="tel"
            error={phoneErr}
          />
        </div>
        {error ? (
          <p className={s.alert} role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className={s.dockNoNav}>
        <Button size="lg" block disabled={!canSave} onClick={() => void save()}>
          ذخیره‌ی آدرس
        </Button>
      </div>
    </div>
  );
}
