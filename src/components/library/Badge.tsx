import s from './Badge.module.css';

export type BadgeTone = 'red' | 'amber' | 'green' | 'ink';

export interface BadgeProps {
  text: string;
  tone?: BadgeTone;
}

/** Small colored badge (best seller / discount / new / status). */
export function Badge({ text, tone = 'red' }: BadgeProps) {
  return <span className={[s.bg, s[tone]].join(' ')}>{text}</span>;
}
