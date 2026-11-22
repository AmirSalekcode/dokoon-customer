import { Icon } from '@/components/primitives/Icon';
import s from './RouteMap.module.css';

export interface RouteMapProps {
  /** Where the leg goes, e.g. «تا رستوران» / «تا مشتری». */
  label: string;
  /** «۶ دقیقه» */
  etaText: string;
  /** «۱٫۲ کیلومتر» */
  distText: string;
  /** Location is being shared (online or active order, courier rule 3): always shown in the UI. */
  tracking: boolean;
  onNeshan: () => void;
  onBalad: () => void;
}

const D_NAV = 'M4 12l16-8-6 16-3-7z';

/**
 * The leg to the restaurant or the customer with Neshan / Balad navigation (deep links, chosen by the
 * courier). The map itself is an illustration until the map provider is decided; the chip carries the
 * real numbers.
 */
export function RouteMap({ label, etaText, distText, tracking, onNeshan, onBalad }: RouteMapProps) {
  return (
    <div className={s.map}>
      <svg className={s.art} viewBox="0 0 358 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect className={s.land} width="358" height="260" />
        <path className={s.street} d="M0 70h358M0 150h358M0 220h358M60 0v260M150 0v260M250 0v260M320 0v260" />
        <path className={s.avenue} d="M0 110L358 90" />
        <rect className={s.block} x="170" y="165" width="60" height="40" rx="8" />
        <path className={s.route} d="M70 190C70 150 150 150 150 110S250 80 290 60" />
        <circle className={s.me} cx="70" cy="190" r="10" />
        <circle className={s.meDot} cx="70" cy="190" r="4" />
        <path className={s.pin} d="M290 24c-9 0-15 7-15 15 0 11 15 26 15 26s15-15 15-26c0-8-6-15-15-15z" />
        <circle className={s.meDot} cx="290" cy="39" r="6" />
      </svg>
      <div className={s.top}>
        <p className={s.chip}>
          <small>{label}</small>
          <b>
            {etaText} · {distText}
          </b>
        </p>
        {tracking ? (
          <span className={s.tracking} role="status">
            <i aria-hidden="true" />
            ردیابی فعال
          </span>
        ) : null}
      </div>
      <div className={s.buttons}>
        <button type="button" onClick={onNeshan}>
          <Icon d={D_NAV} size={20} />
          مسیریابی با نشان
        </button>
        <button type="button" onClick={onBalad}>
          <Icon d={D_NAV} size={20} />
          مسیریابی با بلد
        </button>
      </div>
    </div>
  );
}
