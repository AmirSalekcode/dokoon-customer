import { existsSync } from 'node:fs';
import path from 'node:path';
import { SCREEN_IDS } from '@/nav/types';
import { IMPLEMENTED_SCREENS, screenFor } from './registry';

describe('screen registry', () => {
  it('every ScreenId has a real screen (no placeholder fallback left)', () => {
    expect([...IMPLEMENTED_SCREENS].sort()).toEqual([...SCREEN_IDS].sort());
    for (const id of SCREEN_IDS) expect(screenFor(id), id).toBeTypeOf('function');
  });

  it('the placeholder screen is gone', () => {
    expect(existsSync(path.resolve(__dirname, 'PlaceholderScreen.tsx'))).toBe(false);
  });
});
