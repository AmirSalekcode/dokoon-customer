import { expect, type Page } from '@playwright/test';

/** A signed-in manager on this device (mock tokens carry the phone; see src/panel/mocks/handlers.ts). */
export async function seedSession(page: Page, status = 'active', phone = '09131234567') {
  await page.addInitScript(
    ([st, ph]) =>
      localStorage.setItem(
        'dk-r-session',
        JSON.stringify({ accessToken: `r-access-0-${ph}`, refreshToken: `r-refresh-0-${ph}`, status: st }),
      ),
    [status, phone] as const,
  );
}

export const SHIFT_BUTTON = 'شروع شیفت و فعال‌سازی صدا';

/** Open the panel with a seeded session and pass the «شروع شیفت» screen. */
export async function openPanel(page: Page, path = '/') {
  await page.goto(path);
  await page.getByRole('button', { name: SHIFT_BUTTON }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' })).toBeVisible();
}
