import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { toFaDigits } from '@/lib/format';
import { ReviewSheet } from '../library/ReviewSheet';

const meta = {
  title: 'Library/ReviewSheet',
  component: ReviewSheet,
  parameters: { frame: 'full', layout: 'fullscreen' },
  args: {
    foodName: 'چلو کباب کوبیده',
    starItems: [],
    text: '',
    canSubmit: false,
    onClose: fn(),
    onSubmit: fn(),
  },
  render: (a) => {
    const [stars, setStars] = useState(0);
    const [text, setText] = useState('');
    return (
      <div style={{ position: 'relative', height: 640 }}>
        <ReviewSheet
          {...a}
          starItems={[1, 2, 3, 4, 5].map((n) => ({
            label: `${toFaDigits(n)} ستاره`,
            on: n <= stars,
            onPick: () => setStars(n),
          }))}
          starLabel={['', 'خیلی بد', 'بد', 'معمولی', 'خوب', 'عالی'][stars]}
          text={text}
          onText={setText}
          canSubmit={stars > 0}
        />
      </div>
    );
  },
} satisfies Meta<typeof ReviewSheet>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
