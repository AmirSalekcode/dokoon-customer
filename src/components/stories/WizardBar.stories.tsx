import type { Meta, StoryObj } from '@storybook/react-vite';
import { WizardBar } from '../library/WizardBar';

const meta = {
  title: 'Restaurant/WizardBar',
  component: WizardBar,
  args: {
    label: 'مراحل ثبت‌نام',
    steps: [
      { label: 'اطلاعات', state: 'done' },
      { label: 'مدارک', state: 'cur' },
      { label: 'شبا', state: 'todo' },
      { label: 'بررسی', state: 'todo' },
    ],
  },
} satisfies Meta<typeof WizardBar>;
export default meta;
type S = StoryObj<typeof meta>;

export const SecondStep: S = {};
export const FirstStep: S = {
  args: {
    steps: [
      { label: 'اطلاعات', state: 'cur' },
      { label: 'مدارک', state: 'todo' },
      { label: 'شبا', state: 'todo' },
      { label: 'بررسی', state: 'todo' },
    ],
  },
};
