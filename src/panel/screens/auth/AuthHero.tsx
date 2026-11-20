import { Art } from '@/components/primitives/Art';
import { Logo } from '@/components/primitives/Logo';
import s from './auth.module.css';

/** Dark hero of the entry screens (logo, tag, illustration, one line). */
export function AuthHero({ tag, art, text }: { tag: string; art: string; text: string }) {
  return (
    <header className={s.hero}>
      <Logo height={50} />
      <span className={s.tag}>{tag}</span>
      <Art src={art} className={s.art} />
      <p>{text}</p>
    </header>
  );
}
