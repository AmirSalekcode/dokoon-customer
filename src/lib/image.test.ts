import { afterEach, describe, expect, it, vi } from 'vitest';
import { fitWithin, jpgName, resizeImage } from './image';

describe('fitWithin (longest side ≤ 1600, D-99)', () => {
  it.each([
    [4000, 3000, 1600, 1200],
    [3000, 4000, 1200, 1600],
    [1600, 900, 1600, 900],
    [800, 600, 800, 600],
    [5000, 10, 1600, 3],
  ])('%i×%i → %i×%i', (w, h, ew, eh) => expect(fitWithin(w, h)).toEqual({ width: ew, height: eh }));
});

describe('resizeImage', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubCanvas(sizes: { w: number; h: number }) {
    const drawn: number[][] = [];
    let encoded: { type?: string; quality?: number } = {};
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: sizes.w, height: sizes.h, close: () => {} })),
    );
    const real = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag !== 'canvas') return real(tag);
      const c = {
        width: 0,
        height: 0,
        getContext: () => ({
          fillStyle: '',
          fillRect: () => {},
          drawImage: (_b: unknown, x: number, y: number, w: number, h: number) => drawn.push([x, y, w, h]),
        }),
        toBlob: (cb: (b: Blob) => void, type: string, quality: number) => {
          encoded = { type, quality };
          cb(new Blob(['x'], { type }));
        },
      };
      return c as unknown as HTMLElement;
    });
    return { drawn, encoded: () => encoded };
  }

  it('a large photo becomes a 1600px JPEG at quality 0.85', async () => {
    const st = stubCanvas({ w: 4000, h: 3000 });
    const out = await resizeImage(new File(['big'], 'license.png', { type: 'image/png' }));
    expect(st.drawn).toEqual([[0, 0, 1600, 1200]]);
    expect(st.encoded()).toEqual({ type: 'image/jpeg', quality: 0.85 });
    expect(out.type).toBe('image/jpeg');
    expect(out.name).toBe('license.jpg');
    vi.restoreAllMocks();
  });

  it('PDFs are never touched', async () => {
    const pdf = new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' });
    expect(await resizeImage(pdf)).toBe(pdf);
  });

  it('without image decoding (old WebView) the original is kept', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    const img = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    expect(await resizeImage(img)).toBe(img);
  });

  it('jpgName swaps the extension', () => {
    expect(jpgName('IMG_1.HEIC.png')).toBe('IMG_1.HEIC.jpg');
    expect(jpgName('scan')).toBe('scan.jpg');
  });
});
