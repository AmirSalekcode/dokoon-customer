import type { Meta, StoryObj } from '@storybook/react-vite';
import { MenuList } from '../library/MenuList';
import { menuGroups } from './fixtures';

const meta = { title: 'Library/MenuList', component: MenuList, args: { groups: menuGroups } } satisfies Meta<
  typeof MenuList
>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
