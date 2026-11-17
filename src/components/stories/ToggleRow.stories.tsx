import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ToggleRow } from '../library/ToggleRow';

const meta = {
  title: 'Library/ToggleRow',
  component: ToggleRow,
  args: { title: 'وضعیت سفارش', sub: 'اعلان تأیید، آماده‌سازی و رسیدن پیک', on: true },
  render: (a) => {
    const [on, setOn] = useState(a.on);
    return <ToggleRow {...a} on={on} onFlip={() => setOn(!on)} />;
  },
} satisfies Meta<typeof ToggleRow>;
export default meta;
type S = StoryObj<typeof meta>;
export const On: S = {};
export const Off: S = { args: { on: false } };
