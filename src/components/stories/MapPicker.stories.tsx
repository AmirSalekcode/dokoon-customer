import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { MapPicker } from '../library/MapPicker';

const meta = {
  title: 'Library/MapPicker',
  component: MapPicker,
  args: { pinX: -1, pinY: -1 },
  render: (a) => {
    const [p, setP] = useState({ x: a.pinX, y: a.pinY });
    const inZone = p.x < 0 || Math.hypot(p.x - 50, p.y - 50) < 34;
    return (
      <MapPicker
        {...a}
        pinX={p.x}
        pinY={p.y}
        inZone={inZone}
        onPick={(x, y) => setP({ x, y })}
        onLocate={() => setP({ x: 50, y: 50 })}
      />
    );
  },
} satisfies Meta<typeof MapPicker>;
export default meta;
type S = StoryObj<typeof meta>;
export const Empty: S = {};
export const InZone: S = { args: { pinX: 48, pinY: 52, providerTitle: 'نشان' } };
export const OutOfZone: S = { args: { pinX: 92, pinY: 12 } };
export const Locating: S = { args: { locating: true } };
