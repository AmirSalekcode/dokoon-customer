import type { MouseEvent } from 'react';
import { Icon } from '../primitives/Icon';
import s from './MapPicker.module.css';

export interface MapPickerProps {
  /** Pin position in % of the map box (0–100); negative = no pin yet. */
  pinX: number;
  pinY: number;
  inZone?: boolean;
  locating?: boolean;
  onPick?: (xPct: number, yPct: number) => void;
  onLocate?: () => void;
  /** Provider name shown for transparency, e.g. «نشان». */
  providerTitle?: string;
}

/**
 * Pick a delivery point. This renders the prototype's illustrated placeholder map; the real
 * Neshan/Balad map mounts behind the same props via MapProvider once keys are approved.
 */
export function MapPicker({
  pinX,
  pinY,
  inZone = true,
  locating,
  onPick,
  onLocate,
  providerTitle,
}: MapPickerProps) {
  const hasPin = pinX >= 0 && pinY >= 0;
  const click = (e: MouseEvent<HTMLDivElement>) => {
    if (!onPick) return;
    const r = e.currentTarget.getBoundingClientRect();
    onPick(
      Math.round(((e.clientX - r.left) / r.width) * 1000) / 10,
      Math.round(((e.clientY - r.top) / r.height) * 1000) / 10,
    );
  };
  return (
    <div className={s.mp} role="application" aria-label="نقشه برای انتخاب محل تحویل" onClick={click}>
      {/* `app` re-scopes the light theme tokens (dokoon-tokens.css) so the map stays light in dark mode. */}
      <svg
        className={`app ${s.map}`}
        viewBox="0 0 358 240"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <rect width="358" height="240" className={s.ground} />
        <g className={s.blocks}>
          {[10, 76, 160].map((y, row) =>
            [
              [10, 72],
              [104, 86],
              [212, 70],
              [304, 44],
            ].map(([x, w]) => (
              <rect key={`${row}-${x}`} x={x} y={y} width={w} height={[44, 62, 70][row]} rx="10" />
            )),
          )}
        </g>
        <g className={s.roads}>
          <path d="M0 65H358M0 149H358M93 0V240M201 0V240M293 0V240" />
          <path d="M0 230L120 100L260 0" strokeWidth="8" />
        </g>
        <circle cx="179" cy="120" r="82" className={s.zone} />
      </svg>
      {hasPin ? (
        <>
          <span className={s.ring} style={{ left: `${pinX}%`, top: `${pinY}%` }} />
          <span className={s.pin} style={{ left: `${pinX}%`, top: `${pinY}%` }}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 23s8-7 8-13a8 8 0 1 0-16 0c0 6 8 13 8 13z"
                className={inZone ? s.pinOk : s.pinBad}
              />
              <circle cx="12" cy="10" r="3.2" className={s.pinDot} />
            </svg>
          </span>
        </>
      ) : (
        <div className={s.hint}>روی نقشه ضربه بزنید تا محل تحویل را مشخص کنید</div>
      )}
      <button
        type="button"
        className={[s.loc, locating && s.busy].filter(Boolean).join(' ')}
        onClick={(e) => {
          e.stopPropagation();
          onLocate?.();
        }}
      >
        <Icon name="locate" size={20} />
        {locating ? 'در حال یافتن موقعیت…' : 'موقعیت فعلی من'}
      </button>
      <div className={s.zn}>
        <i />
        محدوده‌ی ارسال{providerTitle ? ` · ${providerTitle}` : ''}
      </div>
      {hasPin && !inZone ? (
        <div className={s.out} role="alert">
          این نقطه خارج از محدوده‌ی ارسال است
        </div>
      ) : null}
    </div>
  );
}
