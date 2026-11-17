import { EmptyState } from '@/components/library/EmptyState';
import { TopBar } from '@/components/library/TopBar';
import { useNav } from '@/nav/nav';
import { TABS } from '@/nav/types';
import { TITLES, type ScreenProps } from './registry';
import s from './screens.module.css';

/** Stand-in for screens built in phase 2. Keeps entry/exit (back) working. */
export function PlaceholderScreen({ route }: ScreenProps) {
  const isTab = (TABS as string[]).includes(route.screen);
  const back = useNav((st) => st.back);
  return (
    <div className={isTab ? s.page : s.pageNoNav}>
      <TopBar title={TITLES[route.screen] ?? route.screen} onBack={isTab ? undefined : () => back()} />
      <EmptyState art="dk-cafe" title="به‌زودی" text="این صفحه در مرحله‌ی بعد ساخته می‌شود." />
      <div className={s.scrollFiller} data-testid="scroll-filler" />
    </div>
  );
}
