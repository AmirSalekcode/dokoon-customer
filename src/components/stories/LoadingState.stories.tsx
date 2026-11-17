import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoadingState } from '../library/LoadingState';

const meta = {
  title: 'Library/LoadingState',
  component: LoadingState,
  parameters: { frame: 'full' },
} satisfies Meta<typeof LoadingState>;
export default meta;
type S = StoryObj<typeof meta>;
export const Home: S = {};
export const List: S = { args: { variant: 'list', rows: 3 } };
