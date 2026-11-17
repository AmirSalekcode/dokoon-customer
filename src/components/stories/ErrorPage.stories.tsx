import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ERROR_CONTENT } from '@/errors/errorContent';
import { ErrorPage } from '../library/ErrorPage';

const c = (k: keyof typeof ERROR_CONTENT) => ({
  code: ERROR_CONTENT[k].code,
  title: ERROR_CONTENT[k].title,
  text: ERROR_CONTENT[k].text,
  d: ERROR_CONTENT[k].d,
  cta: ERROR_CONTENT[k].cta,
  ctaSecondary: ERROR_CONTENT[k].sec,
});

const meta = {
  title: 'Library/ErrorPage',
  component: ErrorPage,
  parameters: { frame: 'full', layout: 'fullscreen' },
  args: { ...c('offline'), onPrimary: fn(), onSecondary: fn() },
  render: (a) => (
    <div style={{ height: 640 }}>
      <ErrorPage {...a} />
    </div>
  ),
} satisfies Meta<typeof ErrorPage>;
export default meta;
type S = StoryObj<typeof meta>;
export const Offline: S = {};
export const E401: S = { args: c('e401') };
export const E403: S = { args: c('e403') };
export const E404: S = { args: c('e404') };
export const E500: S = { args: c('e500') };
export const E503: S = { args: c('e503') };
export const E504: S = { args: c('e504') };
