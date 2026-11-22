import { useId } from 'react';
import { Icon } from '@/components/primitives/Icon';
import s from './PlaceCard.module.css';

export interface PlaceCardProps {
  /** Restaurant or customer name. */
  title: string;
  /** «رستوران» / «مشتری» */
  kind: string;
  address: string;
  /** Delivery note («طبقه ۲، زنگ را دوبار بزنید»); empty = none. */
  extra?: string;
  /** Calling is offered (customer only after accepting and until delivery, courier rule 2). */
  canCall: boolean;
  onCall: () => void;
  onCopy: () => void;
}

const D_COPY = 'M8 8h11v12H8zM5 16V4h11';

/** Restaurant / customer place: name, address, note, «تماس» and «کپی آدرس». */
export function PlaceCard({ title, kind, address, extra, canCall, onCall, onCopy }: PlaceCardProps) {
  const titleId = useId();
  return (
    <section className={s.card} aria-labelledby={titleId}>
      <div className={s.head}>
        <span className={s.icon} aria-hidden="true">
          <Icon name="pin" />
        </span>
        <div>
          <small>{kind}</small>
          <h2 id={titleId}>{title}</h2>
        </div>
      </div>
      <p className={s.address}>{address}</p>
      {extra ? <p className={s.extra}>{extra}</p> : null}
      <div className={s.buttons}>
        {canCall ? (
          <button type="button" className={s.call} onClick={onCall} aria-label={`تماس با ${title}`}>
            <Icon name="phone" size={20} />
            تماس
          </button>
        ) : null}
        <button type="button" className={s.copy} onClick={onCopy} aria-label={`کپی آدرس ${kind}`}>
          <Icon d={D_COPY} size={20} />
          کپی آدرس
        </button>
      </div>
    </section>
  );
}
