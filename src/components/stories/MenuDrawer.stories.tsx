import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { MenuDrawer } from '../library/MenuDrawer';
import { menuGroups } from './fixtures';

const meta = {
  title: 'Library/MenuDrawer',
  component: MenuDrawer,
  parameters: { frame: 'full', layout: 'fullscreen' },
  args: {
    user: { name: 'امیر', initial: 'ا', phone: '۰۹۱۳ ۱۲۳ ۴۵۶۷' },
    city: 'شهرضا',
    groups: menuGroups,
    version: '۰٫۱٫۰',
    onClose: fn(),
  },
  render: (a) => (
    <div style={{ position: 'relative', height: 700 }}>
      <MenuDrawer {...a} />
    </div>
  ),
} satisfies Meta<typeof MenuDrawer>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
