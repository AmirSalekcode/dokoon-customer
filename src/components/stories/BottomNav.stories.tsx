import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { BottomNav } from '../library/BottomNav';

const meta = {
  title: 'Library/BottomNav',
  component: BottomNav,
  parameters: { layout: 'padded' },
  args: { active: 'home', onPick: fn() },
} satisfies Meta<typeof BottomNav>;
export default meta;
type S = StoryObj<typeof meta>;
export const Home: S = {
  decorators: [
    (St) => (
      <div style={{ paddingTop: 40 }}>
        <St />
      </div>
    ),
  ],
};
export const WithCart: S = {
  args: { active: 'offers', cartBadge: '۳' },
  decorators: [
    (St) => (
      <div style={{ paddingTop: 40 }}>
        <St />
      </div>
    ),
  ],
};
