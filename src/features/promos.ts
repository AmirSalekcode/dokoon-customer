import { useCart } from '@/cart/cart';
import { toast } from '@/ui/toast';

async function copy(code: string) {
  try {
    await navigator.clipboard?.writeText(code);
  } catch {
    /* clipboard blocked: the code is still applied/shown */
  }
}

/** «استفاده» on a CouponCard: copy the code, and apply it to the cart when it has items. */
export async function applyPromoCode(code: string) {
  await copy(code);
  const cart = useCart.getState();
  if (cart.lines.length > 0) {
    cart.setPromo(code);
    toast(`کد ${code} روی سبد خرید اعمال شد`, 'success');
  } else toast(`کد ${code} کپی شد`);
}
