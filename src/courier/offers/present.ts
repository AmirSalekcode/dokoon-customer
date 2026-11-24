import { formatDecimal, formatMoney, formatNumber } from '@/lib/format';
import type { Offer } from '../api/types';
import type { OfferView } from '../components';

/**
 * Offer → card text. Neighbourhoods only (courier rule 2): the offer carries no address or phone, and
 * nothing else is shown until the courier accepts.
 */
export function offerView(o: Offer): OfferView {
  const cash = o.cash === true;
  return {
    rest: o.rest ?? '',
    earn: formatMoney(o.earn ?? 0),
    from: o.fromArea ?? '',
    to: o.toArea ?? '',
    dist: `${formatDecimal(o.km ?? 0)} کیلومتر`,
    time: `${formatNumber(o.minutes ?? 0)} دقیقه`,
    pay: cash ? 'نقدی · دریافت از مشتری' : 'پرداخت آنلاین',
    cash,
  };
}
