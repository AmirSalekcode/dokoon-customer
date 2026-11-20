import { ArtSprite } from '@/components/primitives/ArtSprite';
import { Logo } from '@/components/primitives/Logo';
import s from './PanelApp.module.css';

/** Restaurant panel shell (KAN-55 placeholder; header, navigation and screens come in KAN-58). */
export function PanelApp() {
  return (
    <div className={s.shell}>
      <ArtSprite />
      <header className={s.header}>
        <Logo height={24} />
        <span className={s.tag}>رستوران</span>
      </header>
      <main className={s.main}>
        <h1 className={s.title}>دکون رستوران</h1>
        <p className={s.lead}>پنل مدیریت سفارش‌های رستوران.</p>
      </main>
    </div>
  );
}
