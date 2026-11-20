import { EmptyState } from '@/components/library/EmptyState';
import { TopBar } from '@/components/library/TopBar';
import { usePanelNav } from '../../nav/nav';
import type { PanelScreenProps } from '../StackScreens';
import s from './menu.module.css';

/** Food editor route; the editor itself arrives with KAN-67. */
export function DishScreen({ route }: PanelScreenProps) {
  return (
    <div className={s.wrap}>
      <TopBar
        title={route.params.id ? 'ویرایش غذا' : 'افزودن غذا'}
        onBack={() => usePanelNav.getState().back()}
      />
      <div className={s.body}>
        <EmptyState
          art="dk-kebab"
          title="ویرایشگر غذا"
          text="ویرایش نام، قیمت، عکس و گزینه‌های غذا اینجا می‌آید."
        />
      </div>
    </div>
  );
}
