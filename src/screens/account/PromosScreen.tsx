import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import { useCart } from '@/cart/cart';
import { CouponCard } from '@/components/library/CouponCard';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from '../registry';
import s from './account.module.css';

async function copy(code: string) {
  try {
    await navigator.clipboard?.writeText(code);
  } catch {
    /* clipboard blocked: the code is still applied/shown */
  }
}

/** Promo codes (screen-specs §6 promos): copy, and apply to the cart when it has items. */
export function PromosScreen(_: ScreenProps) {
  const back = useNav((st) => st.back);
  const data = useApi(() => unwrap(api.GET('/promos')), []);

  const use = async (code: string) => {
    await copy(code);
    const cart = useCart.getState();
    if (cart.lines.length > 0) {
      cart.setPromo(code);
      toast(`کد ${code} روی سبد خرید اعمال شد`, 'success');
    } else toast(`کد ${code} کپی شد`);
  };

  const body = () => {
    if (data.status === 'loading') return <LoadingState variant="list" />;
    if (data.status === 'error') return <ErrorState onRetry={data.reload} />;
    if (data.data.length === 0)
      return (
        <EmptyState art="dk-mix" title="کد تخفیفی ندارید" text="کدهای تخفیف جدید این‌جا نمایش داده می‌شود." />
      );
    return (
      <div className={s.list}>
        <p className={s.note}>کد را بزنید تا کپی شود؛ اگر سبد خرید دارید، روی آن هم اعمال می‌شود.</p>
        {data.data.map((p) => (
          <CouponCard
            key={p.code}
            badge={p.badge ?? ''}
            title={p.title ?? ''}
            sub={p.sub}
            code={p.code ?? ''}
            onUse={() => void use(p.code ?? '')}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={s.page}>
      <TopBar title="کدهای تخفیف" onBack={() => back()} />
      {body()}
    </div>
  );
}
