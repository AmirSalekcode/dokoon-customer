import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { SearchBar } from '../library/SearchBar';

const meta = {
  title: 'Library/SearchBar',
  component: SearchBar,
  parameters: { frame: 'full' },
  args: { placeholder: 'جستجوی رستوران یا غذا', onTap: fn(), onFilter: fn() },
} satisfies Meta<typeof SearchBar>;
export default meta;
type S = StoryObj<typeof meta>;
export const TapOnly: S = {};
export const WithFilter: S = { args: { showFilter: true, filterCount: '۲' } };
export const Editable: S = {
  args: { editable: true },
  render: (a) => {
    const [v, setV] = useState('کباب');
    return <SearchBar {...a} value={v} onInput={setV} />;
  },
};
