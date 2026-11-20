import { TopBar } from '@/components/library/TopBar';
import { usePanelNav } from '../../nav/nav';
import { OrderDetailPanel } from '../../orders/OrderDetailPanel';
import type { PanelScreenProps } from '../StackScreens';
import s from './orders.module.css';

/** Order detail on phones (`order`, params.id); on tablets the same panel sits next to the list. */
export function OrderScreen({ route }: PanelScreenProps) {
  const id = route.params.id ?? '';
  return (
    <>
      <TopBar title="جزئیات سفارش" level={1} onBack={() => usePanelNav.getState().back()} />
      <div className={s.detailPage}>
        <OrderDetailPanel id={id} />
      </div>
    </>
  );
}
