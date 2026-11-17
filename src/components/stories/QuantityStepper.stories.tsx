import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { toFaDigits } from '@/lib/format';
import { QuantityStepper } from '../library/QuantityStepper';

const meta = {
  title: 'Library/QuantityStepper',
  component: QuantityStepper,
  args: { value: '۱' },
  render: (a) => {
    const [n, setN] = useState(1);
    return (
      <QuantityStepper
        {...a}
        value={toFaDigits(n)}
        onInc={() => setN(n + 1)}
        onDec={() => setN(Math.max(0, n - 1))}
      />
    );
  },
} satisfies Meta<typeof QuantityStepper>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
