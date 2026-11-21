import type { Meta, StoryObj } from '@storybook/react-vite';
import { StageBar, type StageState } from '..';

const labels = ['رستوران', 'تحویل‌گیری', 'مشتری', 'تحویل'];
const at = (cur: number) =>
  labels.map((label, i) => ({ label, state: (i < cur ? 'done' : i === cur ? 'cur' : 'todo') as StageState }));

const meta = {
  title: 'Courier/StageBar',
  component: StageBar,
  parameters: { app: 'courier' },
  args: { stages: at(0) },
} satisfies Meta<typeof StageBar>;
export default meta;
type S = StoryObj<typeof meta>;

export const ToRestaurant: S = {};
export const Pickup: S = { args: { stages: at(1) } };
export const Handover: S = { args: { stages: at(3) } };
