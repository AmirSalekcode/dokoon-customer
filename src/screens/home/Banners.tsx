import { useEffect, useState } from 'react';
import type { Campaign } from '@/api/types';
import { Badge } from '@/components/library/Badge';
import { Art } from '@/components/primitives/Art';
import { Icon } from '@/components/primitives/Icon';
import s from './home.module.css';

const ROTATE_MS = 5000;
const TAGS = ['ویژه', 'پیشنهاد هفته', 'تازه‌ها'];

const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Campaign carousel (prototype `.hv`). Auto-advances unless reduced motion; each slide is labelled. */
export function Banners({ items, onOpen }: { items: Campaign[]; onOpen: (c: Campaign) => void }) {
  const [i, setI] = useState(0);
  const n = items.length;

  useEffect(() => {
    if (n < 2 || reducedMotion()) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), ROTATE_MS);
    return () => clearInterval(t);
  }, [n]);

  if (n === 0) return null;
  return (
    <section className={s.hv} aria-label="پیشنهادهای ویژه" aria-roledescription="carousel">
      <div className={s.track} style={{ transform: `translateX(${i * 100}%)` }}>
        {items.map((b, k) => (
          <article
            key={b.id}
            className={`${s.slide} ${s[`bg${k % 3}`]}`}
            role="group"
            aria-roledescription="slide"
            aria-label={b.title}
            aria-hidden={k !== i}
          >
            <Badge text={TAGS[k % TAGS.length]} tone="ink" />
            <span className={s.ad}>تبلیغ</span>
            <h2>{b.title}</h2>
            <p>{b.text}</p>
            <button type="button" className={s.cta} tabIndex={k === i ? 0 : -1} onClick={() => onOpen(b)}>
              سفارش بده
              <i>
                <Icon name="forward" size={16} />
              </i>
            </button>
            <Art src={b.imageUrl} className={s.art} />
          </article>
        ))}
      </div>
      {n > 1 ? (
        <div className={s.dots} aria-hidden="true">
          {items.map((b, k) => (
            <i key={b.id} className={k === i ? s.on : undefined} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
