import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { createPanelApi } from '../api/client';
import { panelHandlers, resetPanelMockDb } from '../mocks/handlers';
import { prepareFile, uploadFile, UploadError, PHOTO_RULE } from './upload';

const BASE = 'http://panel.test/v1';
beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
});

describe('upload tool', () => {
  it('POST /uploads (multipart) returns the upload id', async () => {
    const out = await uploadFile(
      new File(['abc'], 'a.pdf', { type: 'application/pdf' }),
      createPanelApi(BASE),
    );
    expect(out.id).toMatch(/^up\d+$/);
  });

  it('checks type and size against the rule', async () => {
    await expect(prepareFile(new File(['x'], 'a.gif', { type: 'image/gif' }), PHOTO_RULE)).rejects.toThrow(
      UploadError,
    );
    await expect(
      prepareFile(new File([new Uint8Array(6 * 1024 * 1024)], 'a.jpg', { type: 'image/jpeg' }), PHOTO_RULE),
    ).rejects.toThrow('بیشتر از ۵ مگابایت');
    const ok = new File(['x'], 'a.png', { type: 'image/png' });
    expect(await prepareFile(ok, PHOTO_RULE)).toBe(ok);
  });

  it('a camera photo without a MIME type is recognised by its extension', async () => {
    const f = new File(['x'], 'IMG_1.JPG', { type: '' });
    expect((await prepareFile(f, PHOTO_RULE)).type).toBe('image/jpeg');
  });
});
