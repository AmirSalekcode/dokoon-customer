import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ChoiceSheet } from '../library/ChoiceSheet';
import { ICONS } from '../primitives/Icon';

const meta = {
  title: 'Library/ChoiceSheet',
  component: ChoiceSheet,
  parameters: { frame: 'full', layout: 'fullscreen' },
  args: {
    title: 'انتخاب آدرس تحویل',
    addLabel: 'افزودن آدرس جدید',
    onClose: fn(),
    onAdd: fn(),
    options: [
      {
        id: 'a1',
        title: 'خانه',
        sub: 'شهرضا، خیابان امام',
        icon: ICONS.home,
        selected: true,
        onDelete: fn(),
      },
      { id: 'a2', title: 'محل کار', sub: 'شهرضا، بلوار مطهری', icon: ICONS.pin, onDelete: fn() },
    ],
  },
  render: (a) => (
    <div style={{ position: 'relative', height: 640 }}>
      <ChoiceSheet {...a} />
    </div>
  ),
} satisfies Meta<typeof ChoiceSheet>;
export default meta;
export const Address: StoryObj<typeof meta> = {};
