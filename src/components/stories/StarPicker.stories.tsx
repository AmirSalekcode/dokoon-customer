import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { toFaDigits } from '@/lib/format';
import { StarPicker } from '../library/StarPicker';

const meta = {
  title: 'Library/StarPicker',
  component: StarPicker,
  args: { items: [] },
  render: (a) => {
    const [n, setN] = useState(4);
    return (
      <StarPicker
        {...a}
        items={[1, 2, 3, 4, 5].map((i) => ({
          label: `${toFaDigits(i)} ستاره`,
          on: i <= n,
          onPick: () => setN(i),
        }))}
        label={['', 'خیلی بد', 'بد', 'معمولی', 'خوب', 'عالی'][n]}
      />
    );
  },
} satisfies Meta<typeof StarPicker>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
