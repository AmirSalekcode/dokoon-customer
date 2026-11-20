/**
 * Photo shrinking before upload (D-99): longest side ≤ 1600px, JPEG quality 0.85, so documents and dish
 * photos upload quickly on weak mobile internet. Shared by the panel (registration documents, dish photos)
 * and any future customer upload.
 */
export const MAX_SIDE = 1600;
export const JPEG_QUALITY = 0.85;

/** Size that fits inside `max`×`max` keeping the aspect ratio (never enlarges). */
export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export const isImage = (type: string) => /^image\/(jpeg|png|webp)$/.test(type);

/** File name with the extension swapped to .jpg. */
export const jpgName = (name: string) => `${name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`;

/**
 * Re-encode an image as JPEG within MAX_SIDE. Returns the original file when the browser cannot decode
 * or encode it (old WebView) — the size limit is then checked on the original.
 */
export async function resizeImage(file: File, max = MAX_SIDE, quality = JPEG_QUALITY): Promise<File> {
  if (!isImage(file.type) || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, max);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // JPEG has no transparency: paint white under PNG/WebP alpha instead of black.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
    if (!blob) return file;
    return new File([blob], jpgName(file.name), { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    return file;
  }
}
