import { useEffect, useRef, useState } from 'react';
import type { ErrorKind } from '@/api/errors';
import { Button } from '@/components/base/Button';
import { FilterChip } from '@/components/library/FilterChip';
import { MapPicker } from '@/components/library/MapPicker';
import { TopBar } from '@/components/library/TopBar';
import { readStorage, writeStorage } from '@/lib/storage';
import { useNav } from '@/nav/nav';
import { mountWithFallback, type MapProviderId } from '@/providers/map/MapProvider';
import { mapProviders } from '@/providers/map/fakeMap';
import { useTheme } from '@/theme/theme';
import { SelectCard } from '@/components/library/SelectCard';
import { ICONS } from '@/components/primitives/Icon';
import { toast } from '@/ui/toast';
import s from './screens.module.css';

const KINDS: ErrorKind[] = ['offline', 'e401', 'e403', 'e404', 'e500', 'e503', 'e504'];
const MAP_KEY = 'dk-map-provider';

/** Settings placeholder + developer lab for phase-1 foundations (theme, errors, map, mocks). */
export function FoundationLab() {
  const back = useNav((st) => st.back);
  const showError = useNav((st) => st.showError);
  const openOverlay = useNav((st) => st.openOverlay);
  const { mode, setMode } = useTheme();
  const [mockStatus, setMockStatus] = useState(readStorage('dk-mock-status') ?? '');
  const [mapPref, setMapPref] = useState<MapProviderId>((readStorage(MAP_KEY) as MapProviderId) || 'neshan');
  const [mapUsed, setMapUsed] = useState('');
  const [pin, setPin] = useState({ x: -1, y: -1 });
  const mapEl = useRef<HTMLDivElement>(null);
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'mock';

  useEffect(() => {
    if (!mapEl.current) return;
    let handle: { destroy(): void } | undefined;
    mountWithFallback(mapProviders, mapPref, mapEl.current, {
      center: { lat: 32.0089, lng: 51.8668 },
      zoom: 15,
    })
      .then((r) => {
        handle = r.handle;
        setMapUsed(r.provider.title);
      })
      .catch(() => setMapUsed('ناموفق'));
    return () => handle?.destroy();
  }, [mapPref]);

  // Simple demo zone: within 34% of the map center.
  const inZone = pin.x < 0 || Math.hypot(pin.x - 50, pin.y - 50) < 34;

  return (
    <div className={s.pageNoNav}>
      <TopBar title="تنظیمات" onBack={() => back()} />
      <div className={`${s.pad} ${s.stack}`}>
        <h2 className={s.sectionTitle}>تم</h2>
        <div className={s.stack} role="radiogroup" aria-label="تم">
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

        <h2 className={s.sectionTitle}>نقشه (لایه‌ی MapProvider — ساختگی)</h2>
        <div className={s.chips} role="radiogroup" aria-label="ارائه‌دهنده‌ی نقشه">
          {(['neshan', 'balad'] as const).map((id) => (
            <FilterChip
              key={id}
              label={id === 'neshan' ? 'نشان' : 'بلد'}
              selected={mapPref === id}
              onPick={() => {
                setMapPref(id);
                writeStorage(MAP_KEY, id);
              }}
            />
          ))}
        </div>
        <div ref={mapEl}>
          <MapPicker
            pinX={pin.x}
            pinY={pin.y}
            inZone={inZone}
            providerTitle={mapUsed}
            onPick={(x, y) => setPin({ x, y })}
            onLocate={() => setPin({ x: 50, y: 50 })}
          />
        </div>

        {isDev ? (
          <>
            <h2 className={s.sectionTitle}>پیش‌نمایش صفحات خطا (فقط نسخه‌ی توسعه)</h2>
            <div className={s.chips}>
              {KINDS.map((k) => (
                <FilterChip key={k} label={k} onPick={() => showError(k)} />
              ))}
            </div>
            <h2 className={s.sectionTitle}>خطای ساختگی سرور (mock)</h2>
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
            <h2 className={s.sectionTitle}>اوورلی و پیام</h2>
            <div className={s.chips}>
              <Button variant="secondary" onClick={() => toast('این یک پیام آزمایشی است')}>
                پیام کوتاه
              </Button>
              <Button variant="secondary" onClick={() => openOverlay({ kind: 'filter' })}>
                شیت فیلتر
              </Button>
              <Button variant="secondary" onClick={() => openOverlay({ kind: 'delconfirm' })}>
                دیالوگ حذف
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
