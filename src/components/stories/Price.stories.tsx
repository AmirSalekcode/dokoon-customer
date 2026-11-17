import type { Meta, StoryObj } from '@storybook/react-vite';
import { Price } from '../library/Price';

const meta = { title: 'Library/Price', component: Price, args: { price: 285000 } } satisfies Meta<
  typeof Price
>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {};
export const WithOld: S = { args: { old: 320000 } };
