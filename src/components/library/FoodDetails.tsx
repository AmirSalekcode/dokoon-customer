import type { UIEvent } from 'react';
import { Sheet, SheetHandle } from '../base/Sheet';
import { Art } from '../primitives/Art';
import { Icon } from '../primitives/Icon';
import { toFaDigits } from '@/lib/format';
import { Price } from './Price';
import { QuantityStepper } from './QuantityStepper';
import { Rating } from './Rating';
import s from './FoodDetails.module.css';

export interface FoodOptionVM {
  id: string;
  name: string;
  /** e.g. «+۲۰٬۰۰۰ تومان» or «رایگان» */
  priceText?: string;
  selected?: boolean;
  disabled?: boolean;
  onPick?: () => void;
}

export interface FoodGroupVM {
  id: string;
  title: string;
  required?: boolean;
  /** Multiple choice (checkbox) vs single (radio). */
  multi?: boolean;
  /** e.g. «الزامی» / «اختیاری، تا ۳ مورد» */
  tag: string;
  options: FoodOptionVM[];
}

export interface FoodReviewVM {
  id: string;
  initial: string;
  name: string;
  date: string;
  stars: number;
  text: string;
  mine?: boolean;
}

export interface FoodDetailsData {
  name: string;
  restaurantName?: string;
  art?: string;
  /** Pre-formatted rating/count (Persian digits). */
  rating?: string;
  reviewCount?: string;
  price: number;
  oldPrice?: number | null;
  serving?: string;
  includes?: { n: string; w: string }[];
  desc?: string;
  groups?: FoodGroupVM[];
  reviews?: FoodReviewVM[];
  /** undefined = still loading (shows a loader); [] = no reviews yet. */
  /** Star distribution 5→1: label + percent. */
  dist?: { n: string; pct: number; pctText?: string }[];
  hasMore?: boolean;
}

export interface FoodDetailsProps {
  food: FoodDetailsData;
  qtyText: string;
  /** Live total (Persian digits, no unit). */
  totalText: string;
  /** False until required options are chosen (or when not orderable). */
  canAdd: boolean;
  ctaLabel?: string;
  onClose: () => void;
  onInc?: () => void;
  onDec?: () => void;
  onAdd?: () => void;
  onReview?: () => void;
  /** For incremental review loading on scroll. */
  onScroll?: (e: UIEvent<HTMLDivElement>) => void;
}

/** Food sheet: options, quantity, live price, reviews, add-to-cart. No per-food note (cart note only). */
export function FoodDetails({
  food: f,
  qtyText,
  totalText,
  canAdd,
  ctaLabel = 'افزودن به سبد',
  onClose,
  onInc,
  onDec,
  onAdd,
  onReview,
  onScroll,
}: FoodDetailsProps) {
  const reviews = f.reviews ?? [];
  const reviewsLoading = f.reviews === undefined;
  return (
    <Sheet label={`جزئیات ${f.name}`} onClose={onClose} height="full" className={s.sh}>
      <div className={s.pic}>
        <span className={s.hl}>
          <SheetHandle />
        </span>
        <button type="button" className={s.x} aria-label="بستن" onClick={onClose}>
          <Icon name="close" />
        </button>
        <Art src={f.art} className={s.fa} />
      </div>
      <div className={s.bd} onScroll={onScroll} data-testid="food-body">
        <div className={s.t1}>
          <div>
            <h2>{f.name}</h2>
            {f.restaurantName ? <p className={s.rn}>{f.restaurantName}</p> : null}
          </div>
          {f.rating ? <Rating value={f.rating} count={f.reviewCount} /> : null}
        </div>
        <div className={s.pr}>
          <Price price={f.price} old={f.oldPrice} />
          {f.serving ? <span className={s.sv}>{f.serving}</span> : null}
        </div>
        {f.includes?.length ? (
          <>
            <h3 className={s.h}>این پرس شامل</h3>
            <div className={s.box}>
              {f.includes.map((i) => (
                <div key={i.n} className={s.inc}>
                  <span>{i.n}</span>
                  <span>{i.w}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
        {f.desc ? (
          <>
            <h3 className={s.h}>توضیحات</h3>
            <p className={s.ds}>{f.desc}</p>
          </>
        ) : null}
        {(f.groups ?? []).map((g) => (
          <section key={g.id} aria-label={g.title}>
            <div className={s.gh}>
              <h3>{g.title}</h3>
              <span className={[s.tg, g.required ? s.rq : s.op2].join(' ')}>{g.tag}</span>
            </div>
            <div className={s.box} role={g.multi ? 'group' : 'radiogroup'} aria-label={g.title}>
              {g.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={[s.op, o.selected && s.on].filter(Boolean).join(' ')}
                  role={g.multi ? 'checkbox' : 'radio'}
                  aria-checked={!!o.selected}
                  disabled={o.disabled}
                  onClick={o.onPick}
                >
                  <span className={[s.mk, g.multi && s.sq].filter(Boolean).join(' ')} />
                  <span className={s.nm}>{o.name}</span>
                  {o.priceText ? <span className={s.pp}>{o.priceText}</span> : null}
                </button>
              ))}
            </div>
          </section>
        ))}
        <div className={s.rt}>
          <h3 className={s.h}>نظرات کاربران</h3>
          <button type="button" className={s.nr} onClick={onReview}>
            <Icon name="plus" size={20} />
            ثبت نظر
          </button>
        </div>
        {reviews.length ? (
          <>
            <div className={s.sm}>
              <div className={s.big}>
                <b>{f.rating}</b>
                <span>از {f.reviewCount} نظر</span>
              </div>
              <ul className={s.bars} aria-label="پراکندگی امتیازها">
                {(f.dist ?? []).map((b) => (
                  <li key={b.n} className={s.br} aria-label={`${b.n} ستاره: ${b.pctText ?? b.pct}٪`}>
                    <span aria-hidden="true">{b.n}</span>
                    <i aria-hidden="true">
                      <u style={{ width: `${b.pct}%` }} />
                    </i>
                  </li>
                ))}
              </ul>
            </div>
            <ul className={s.rvl} aria-label="نظرات کاربران">
              {reviews.map((v) => (
                <li key={v.id} className={s.rv}>
                  <div className={s.rh}>
                    <span className={s.av}>{v.initial}</span>
                    <div>
                      <b>{v.name}</b>
                      <small>{v.date}</small>
                    </div>
                    <span className={s.vs} aria-label={`${toFaDigits(v.stars)} از ۵ ستاره`}>
                      {'★'.repeat(v.stars)}
                    </span>
                  </div>
                  <p>{v.text}</p>
                  {v.mine ? <span className={s.mine}>نظر شما</span> : null}
                </li>
              ))}
            </ul>
            {f.hasMore ? (
              <div className={s.ldg} role="status" aria-label="در حال بارگذاری نظرات">
                <i />
                <i />
              </div>
            ) : null}
          </>
        ) : reviewsLoading ? (
          <div className={s.ldg} role="status" aria-label="در حال بارگذاری نظرات">
            <i />
            <i />
          </div>
        ) : (
          <p className={s.ds}>هنوز نظری ثبت نشده است. اولین نفر باشید.</p>
        )}
      </div>
      <div className={s.ft}>
        <QuantityStepper value={qtyText} onInc={onInc} onDec={onDec} itemName={f.name} />
        <button type="button" className={s.ad} disabled={!canAdd} onClick={onAdd}>
          <span>{ctaLabel}</span>
          {canAdd ? <span className={s.tot}>{totalText} تومان</span> : null}
        </button>
      </div>
    </Sheet>
  );
}
