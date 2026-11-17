import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../library/Badge';

const meta = { title: 'Library/Badge', component: Badge, args: { text: 'پرفروش' } } satisfies Meta<
  typeof Badge
>;
export default meta;
type S = StoryObj<typeof meta>;
export const Red: S = {};
export const Amber: S = { args: { tone: 'amber', text: '۲ عدد در سبد' } };
export const Green: S = { args: { tone: 'green', text: 'جدید' } };
export const Ink: S = { args: { tone: 'ink', text: 'تحویل شد' } };
