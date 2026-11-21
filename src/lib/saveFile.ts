import { DokoonNative } from './native';
import { isNative } from './platform';

/**
 * Give the user a generated/downloaded file (KAN-75): a normal download in the browser/PWA; in the Android
 * app (no blob downloads in the WebView) the system share sheet via Dokoon's plugin.
 * Resolves `downloaded` or `shared`.
 */
export interface SaveDeps {
  native: () => boolean;
  share: (o: { name: string; base64: string; mime: string; title?: string }) => Promise<unknown>;
  download: (blob: Blob, name: string) => void;
}

/** File names stay ASCII (the share sheet and old Android file managers mangle others). */
export const safeFileName = (name: string) => name.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80);

function browserDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

const defaults: SaveDeps = {
  native: isNative,
  share: (o) => DokoonNative.shareFile(o),
  download: browserDownload,
};

export async function saveFile(
  blob: Blob,
  name: string,
  title?: string,
  deps: SaveDeps = defaults,
): Promise<'downloaded' | 'shared'> {
  const file = safeFileName(name);
  if (deps.native()) {
    await deps.share({ name: file, base64: await blobToBase64(blob), mime: blob.type, title });
    return 'shared';
  }
  deps.download(blob, file);
  return 'downloaded';
}
