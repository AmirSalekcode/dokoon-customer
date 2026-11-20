import { EmptyState } from '@/components/library/EmptyState';
import { TopBar } from '@/components/library/TopBar';
import { usePanelNav } from '../../nav/nav';
import s from './auth.module.css';

/** Registration wizard (info, documents, Sheba, review): KAN-60. */
export function RegScreen() {
  return (
    <div className={s.wrap}>
      <TopBar title="ثبت‌نام رستوران" onBack={() => usePanelNav.getState().back()} />
      <div className={s.body}>
        <EmptyState art="dk-all" title="ثبت‌نام رستوران" text="مراحل ثبت‌نام اینجا می‌آید." />
      </div>
    </div>
  );
}
