import { useEffect } from 'react';
import { Logo } from '@/components/primitives/Logo';
import { bootCourier } from '../../auth/flow';
import s from './auth.module.css';

/** Start splash while `GET /c/me` decides between login, registration, waiting and the orders tab. */
export function BootScreen() {
  useEffect(() => {
    void bootCourier();
  }, []);
  return (
    <div className={s.boot} role="status" aria-label="در حال بارگذاری">
      <Logo height={50} />
      <span className={s.spinner} aria-hidden="true" />
    </div>
  );
}
