import type { Meta, StoryObj } from '@storybook/react-vite';
import { StepBar } from '../library/StepBar';
import { steps } from './fixtures';

const meta = { title: 'Library/StepBar', component: StepBar, args: { steps } } satisfies Meta<typeof StepBar>;
export default meta;
export const Preparing: StoryObj<typeof meta> = {};
