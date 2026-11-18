import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/library/EmptyState';
import { TopBar } from '@/components/library/TopBar';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import s from './more.module.css';

/**
 * «Coming soon» (screen-specs §6 soon) for features that are not active yet. Optional params:
 * `title` (top bar) and `text` (what is coming).
 */
export function SoonScreen({ route }: ScreenProps) {
  const back = useNav((st) => st.back);
  return (
    <div className={s.page}>
      <TopBar title={route.params.title || 'به‌زودی'} onBack={() => back()} />
      <EmptyState
        art="dk-cafe"
        title="به‌زودی در دکون"
        text={route.params.text || 'این قابلیت هنوز فعال نشده است و به‌زودی اضافه می‌شود.'}
        action={
          <Button size="lg" onClick={() => back()}>
            بازگشت
          </Button>
        }
      />
    </div>
  );
}
