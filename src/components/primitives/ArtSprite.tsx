import sprite from '@/assets/art-sprite.svg?raw';

/**
 * Mount once at the app root: provides the dk-* illustration symbols and the dk-logo symbol.
 * Must NOT be display:none — Chrome drops gradients referenced from hidden SVG defs.
 * The sprite <svg> itself is 0×0 and absolutely positioned.
 */
export function ArtSprite() {
  return <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: sprite }} />;
}
