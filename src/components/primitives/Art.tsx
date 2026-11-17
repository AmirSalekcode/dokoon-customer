import s from './primitives.module.css';

/**
 * Food / category illustration. Accepts:
 *  - a prototype symbol id ("dk-burger") or "art:dk-burger" (mock data), rendered from the sprite;
 *  - a real image URL (API imageUrl/coverUrl), rendered as a lazy <img> with object-fit: cover.
 */
export interface ArtProps {
  src?: string | null;
  className?: string;
  /** Decorative by default. Pass alt for meaningful images. */
  alt?: string;
}

export function resolveArt(src?: string | null): { symbol: string } | { url: string } {
  if (!src) return { symbol: 'dk-all' };
  if (src.startsWith('art:')) return { symbol: src.slice(4) };
  if (src.startsWith('dk-')) return { symbol: src };
  return { url: src };
}

export function Art({ src, className, alt }: ArtProps) {
  const r = resolveArt(src);
  if ('url' in r) {
    return (
      <img
        className={[s.img, className].filter(Boolean).join(' ')}
        src={r.url}
        alt={alt ?? ''}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      aria-hidden={alt ? undefined : true}
      role={alt ? 'img' : undefined}
      aria-label={alt}
    >
      <use href={`#${r.symbol}`} />
    </svg>
  );
}
