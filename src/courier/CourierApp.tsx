import { ArtSprite } from '@/components/primitives/ArtSprite';
import { Logo } from '@/components/primitives/Logo';
import s from './CourierApp.module.css';

/** Courier app shell (KAN-85 placeholder; header, tabs and screens come in KAN-88/KAN-89). */
export function CourierApp() {
  return (
    <div className={s.shell}>
      <ArtSprite />
      <header className={s.header}>
        <Logo height={26} />
        <span className={s.tag}>پیک</span>
      </header>
      <main className={s.main}>
        <h1 className={s.title}>دکون پیک</h1>
        <p className={s.lead}>دریافت و تحویل سفارش‌های دکون.</p>
      </main>
    </div>
  );
}
