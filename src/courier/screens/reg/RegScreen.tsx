import { EmptyState } from '@/components/library/EmptyState';
import { TopBar } from '@/components/library/TopBar';
import { signOutToLogin } from '../../auth/flow';
import type { CourierScreenProps } from '../types';
import s from '../screens.module.css';

/**
 * Registration target of the login routing (status `new`). The four-step wizard (details, documents from
 * `GET /c/doc-types`, Sheba, submit) replaces this page in KAN-91.
 */
export function RegScreen({ route }: CourierScreenProps) {
  void route;
  return (
    <div className={s.page}>
      <TopBar title="ثبت‌نام پیک" onBack={signOutToLogin} />
      <EmptyState
        art="dk-fries"
        title="این شماره هنوز پیک دکون نیست"
        text="ثبت‌نام (اطلاعات، مدارک و شبا) در این بخش انجام می‌شود."
      />
    </div>
  );
}
