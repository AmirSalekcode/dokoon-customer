import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { ErrorKind } from '@/api/errors';
import type { Settings } from '@/api/types';
import { unwrap, useApi } from '@/api/useApi';
import { useLaunch } from '@/auth/flow';
import { useSession } from '@/auth/session';
import { Button } from '@/components/base/Button';
import { FilterChip } from '@/components/library/FilterChip';
import { ListRow } from '@/components/library/ListRow';
import { SelectCard } from '@/components/library/SelectCard';
import { ToggleRow } from '@/components/library/ToggleRow';
import { TopBar } from '@/components/library/TopBar';
import { ICONS } from '@/components/primitives/Icon';
import { config, type MapId } from '@/config/env';
import { useConsent } from '@/consent/consent';
import { readJson, readStorage, writeJson, writeStorage } from '@/lib/storage';
import { useNav } from '@/nav/nav';
import { useTheme } from '@/theme/theme';
import { toast } from '@/ui/toast';
import type { ScreenProps } from '../registry';
import s from './account.module.css';
import a from '../cart/addaddr.module.css';

const KINDS: ErrorKind[] = ['offline', 'e401', 'e403', 'e404', 'e500', 'e503', 'e504'];
const MAPS: { id: MapId; title: string }[] = [
  { id: 'neshan', title: 'نشان' },
  { id: 'balad', title: 'بلد' },
];
const NOTIFY: { key: keyof Settings; title: string; sub: string }[] = [
  { key: 'notifyOrders', title: 'وضعیت سفارش', sub: 'پذیرش، آماده‌سازی و رسیدن پیک' },
  { key: 'notifyPromos', title: 'تخفیف‌ها و پیشنهادها', sub: 'کدهای تخفیف و جشنواره‌ها' },
  { key: 'notifyNews', title: 'اخبار دکون', sub: 'رستوران‌های جدید و تغییرات' },
];

/** Settings (screen-specs §6): theme, city, map service, notifications, cookies, delete account. */
export function SettingsScreen(_: ScreenProps) {
  const { back, push, showError, openOverlay } = useNav.getState();
  const { mode, setMode } = useTheme();
  const loggedIn = useSession((st) => !!st.accessToken);
  const cityId = useLaunch((st) => st.cityId);
  const cities = useApi(() => unwrap(api.GET('/cities')), [], { fullPageErrors: false });
  const [mapId, setMapId] = useState<MapId>(() => readJson<MapId>('dk-map', config.defaultMap));
  const [prefs, setPrefs] = useState<Settings | null>(null);
  const [mockStatus, setMockStatus] = useState(readStorage('dk-mock-status') ?? '');
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'mock';

  useEffect(() => {
    if (!loggedIn) return;
    let alive = true;
    api
      .GET('/me/settings')
      .then(({ data }) => alive && data && setPrefs(data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [loggedIn]);

  const flip = async (key: keyof Settings) => {
    if (!prefs) return;
    const before = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      const { error } = await api.PUT('/me/settings', { body: next });
      if (error !== undefined) throw error;
    } catch {
      setPrefs(before);
      toast('ذخیره نشد. دوباره تلاش کنید.', 'error');
    }
  };

  const cityName =
    cities.status === 'success' ? (cities.data.find((c) => c.id === cityId)?.name ?? 'انتخاب نشده') : '';

  return (
    <div className={s.page}>
      <TopBar title="تنظیمات" onBack={() => back()} />
      <div className={s.body}>
        <h2 className={s.h}>تم</h2>
        <div className={s.group} role="radiogroup" aria-label="تم">
          {(
            [
              ['system', 'مطابق گوشی', 'با روشن و خاموش شدن حالت تیره‌ی گوشی عوض می‌شود', ICONS.info],
              ['light', 'روشن', 'همیشه روشن', ICONS.sun],
              ['dark', 'تیره', 'همیشه تیره', ICONS.moon],
            ] as const
          ).map(([id, title, sub, icon]) => (
            <SelectCard
              key={id}
              title={title}
              sub={sub}
              icon={icon}
              radio
              selected={mode === id}
              onPick={() => setMode(id)}
            />
          ))}
        </div>

        <h2 className={s.h}>شهر و نقشه</h2>
        <ListRow title="شهر" sub={cityName} d={ICONS.pin} onTap={() => push('city', { from: 'settings' })} />
        <div role="radiogroup" aria-label="سرویس نقشه" className={a.maps}>
          {MAPS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mapId === m.id}
              className={[a.map, mapId === m.id && a.on].filter(Boolean).join(' ')}
              onClick={() => {
                setMapId(m.id);
                writeJson('dk-map', m.id);
              }}
            >
              {m.title}
            </button>
          ))}
        </div>

        {loggedIn ? (
          <>
            <h2 className={s.h}>اعلان‌ها</h2>
            {prefs
              ? NOTIFY.map((n) => (
                  <ToggleRow
                    key={n.key}
                    title={n.title}
                    sub={n.sub}
                    on={!!prefs[n.key]}
                    onFlip={() => void flip(n.key)}
                  />
                ))
              : null}
          </>
        ) : null}

        <h2 className={s.h}>حریم خصوصی</h2>
        <Button variant="secondary" onClick={() => useConsent.getState().reset()}>
          تنظیمات کوکی
        </Button>
        {loggedIn ? (
          <Button
            variant="danger"
            onClick={() => openOverlay({ kind: 'dlg', props: { action: 'delete-account' } })}
          >
            حذف حساب کاربری
          </Button>
        ) : null}

        {isDev ? (
          <>
            <h2 className={s.h}>پیش‌نمایش صفحات خطا (فقط نسخه‌ی توسعه)</h2>
            <div className={s.chips}>
              {KINDS.map((k) => (
                <FilterChip key={k} label={k} onPick={() => showError(k)} />
              ))}
            </div>
            <h2 className={s.h}>خطای ساختگی سرور (mock)</h2>
            <div className={s.chips}>
              {['', '500', '503', '504', '404', '401'].map((st) => (
                <FilterChip
                  key={st || 'off'}
                  label={st || 'خاموش'}
                  selected={mockStatus === st}
                  onPick={() => {
                    writeStorage('dk-mock-status', st || null);
                    setMockStatus(st);
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
