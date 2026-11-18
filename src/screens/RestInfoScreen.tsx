import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { ContactRow } from '@/components/library/ContactRow';
import { ErrorState } from '@/components/library/ErrorState';
import { InfoList } from '@/components/library/InfoList';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { formatDecimal, formatMoney, formatNumber, toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from './registry';
import s from './restaurant/restinfo.module.css';

/** Restaurant info (screen-specs §2 restinfo): address, hours, contact, rating, delivery terms. */
export function RestInfoScreen({ route }: ScreenProps) {
  const id = route.params.restaurantId ?? '';
  const back = useNav((st) => st.back);
  const data = useApi(() => unwrap(api.GET('/restaurants/{id}', { params: { path: { id } } })), [id]);

  const body = () => {
    if (data.status === 'loading') return <LoadingState variant="list" />;
    if (data.status === 'error') return <ErrorState onRetry={data.reload} />;
    const r = data.data;
    const about = [
      { label: 'نشانی', value: r.address || '—' },
      { label: 'ساعت کاری', value: r.hours || '—' },
      {
        label: 'امتیاز',
        value: r.rating
          ? `${formatDecimal(r.rating)} از ۵ (${formatNumber(r.reviews ?? 0)} نظر)`
          : 'هنوز امتیازی ثبت نشده',
      },
    ];
    const delivery = [
      {
        label: 'زمان ارسال',
        value:
          r.etaMin != null && r.etaMax != null
            ? `${toFaDigits(r.etaMin)} تا ${toFaDigits(r.etaMax)} دقیقه`
            : '—',
      },
      { label: 'هزینه‌ی ارسال', value: r.fee ? formatMoney(r.fee) : 'رایگان' },
      { label: 'حداقل سفارش', value: r.minOrder ? formatMoney(r.minOrder) : 'ندارد' },
      { label: 'روش پرداخت', value: r.allowCash ? 'آنلاین و نقدی هنگام تحویل' : 'فقط آنلاین' },
    ];
    return (
      <div className={s.body}>
        <h1 className={s.name}>{r.name}</h1>
        {r.open === false ? (
          <p className={s.closed} role="status">
            بسته است — بازشدن بعدی: {r.opensNext || 'نامشخص'}
          </p>
        ) : null}
        <section aria-label="مشخصات رستوران">
          <InfoList rows={about} />
        </section>
        <section aria-labelledby="ri-delivery">
          <h2 id="ri-delivery" className={s.head}>
            شرایط ارسال
          </h2>
          <InfoList rows={delivery} />
        </section>
        {r.phone ? (
          <section aria-labelledby="ri-contact">
            <h2 id="ri-contact" className={s.head}>
              تماس
            </h2>
            <ContactRow title={r.name ?? ''} sub={toFaDigits(r.phone)} href={`tel:${r.phone}`} />
          </section>
        ) : null}
      </div>
    );
  };

  return (
    <div className={s.page}>
      <TopBar title="اطلاعات رستوران" onBack={() => back()} />
      {body()}
    </div>
  );
}
