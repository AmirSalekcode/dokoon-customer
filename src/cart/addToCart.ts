import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import { useCart, type CartRestaurant, type PendingAdd } from './cart';

/**
 * Add to the single shared cart. If the cart belongs to another restaurant, open the
 * «سبد خرید قبلی خالی شود؟» confirm overlay (CLAUDE.md rule 5).
 */
export function addToCart(restaurant: CartRestaurant, line: PendingAdd['line']): void {
  const res = useCart.getState().add(restaurant, line);
  if (res === 'needs-confirm') useNav.getState().openOverlay({ kind: 'confirm' });
  else toast('به سبد خرید اضافه شد', 'success');
}
