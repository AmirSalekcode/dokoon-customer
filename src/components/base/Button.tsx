import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../primitives/Icon';
import s from './base.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'md' | 'lg';
  block?: boolean;
  loading?: boolean;
  icon?: IconName;
  children: ReactNode;
}

/** Primary/secondary/danger/ghost button. Disabled while loading (prevents double submit). */
export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading,
  icon,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[s.btn, s[variant], s[size], block && s.block, className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className={s.spinner} aria-hidden="true" />
      ) : icon ? (
        <Icon name={icon} size={20} />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
