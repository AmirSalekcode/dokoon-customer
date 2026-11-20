import { Button } from '@/components/base/Button';
import { usePanelNav } from '../../nav/nav';
import { useShift } from '../../state/shift';
import { AuthHero } from './AuthHero';
import s from './auth.module.css';

/** «شروع شیفت» (restaurant screen specs §1). The sound engine and tips arrive with KAN-61. */
export function ShiftScreen() {
  const start = () => {
    useShift.getState().start();
    usePanelNav.getState().resetTo('orders');
  };
  return (
    <div className={s.wrap}>
      <AuthHero tag="شروع شیفت" art="dk-cafe" text="برای دریافت سفارش‌ها با صدا، شیفت را شروع کنید." />
      <div className={s.body}>
        <Button size="lg" block onClick={start}>
          شروع شیفت و فعال‌سازی صدا
        </Button>
      </div>
    </div>
  );
}
