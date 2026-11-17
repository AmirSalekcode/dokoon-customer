import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ErrorState } from '../library/ErrorState';

const meta = { title: 'Library/ErrorState', component: ErrorState, args: { onRetry: fn() } } satisfies Meta<
  typeof ErrorState
>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
