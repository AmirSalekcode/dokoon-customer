import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Sheet, SheetHandle } from '../base/Sheet';

const meta = {
  title: 'Base/Sheet',
  component: Sheet,
  parameters: { frame: 'full', layout: 'fullscreen' },
  args: { label: 'نمونه', onClose: fn(), children: null },
  render: (a) => (
    <div style={{ position: 'relative', height: 640 }}>
      <Sheet {...a}>
        <SheetHandle />
        <p style={{ padding: 16 }}>محتوای شیت پایین. با ضربه روی پرده یا Escape بسته می‌شود.</p>
      </Sheet>
    </div>
  ),
} satisfies Meta<typeof Sheet>;
export default meta;
type S = StoryObj<typeof meta>;

export const Bottom: S = {};
export const Tall: S = { args: { height: 'tall' } };
export const SideDrawer: S = { args: { side: true } };
