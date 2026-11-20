import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { UploadTile } from '../library/UploadTile';

const meta = {
  title: 'Restaurant/UploadTile',
  component: UploadTile,
  args: { label: 'مجوز کسب', sub: 'عکس یا PDF', onTap: fn() },
  render: (a) => (
    <div style={{ width: 172 }}>
      <UploadTile {...a} />
    </div>
  ),
} satisfies Meta<typeof UploadTile>;
export default meta;
type S = StoryObj<typeof meta>;

export const Empty: S = {};
export const Uploading: S = { args: { busy: true, sub: 'در حال بارگذاری' } };
export const Done: S = { args: { done: true, sub: 'بارگذاری شد · تغییر' } };
