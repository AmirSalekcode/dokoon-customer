import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { PromoCodeInput } from '../library/PromoCodeInput';

const meta = {
  title: 'Library/PromoCodeInput',
  component: PromoCodeInput,
  args: { value: '' },
  render: (a) => {
    const [v, setV] = useState(a.value);
    return <PromoCodeInput {...a} value={v} onInput={setV} />;
  },
} satisfies Meta<typeof PromoCodeInput>;
export default meta;
type S = StoryObj<typeof meta>;
export const Empty: S = {};
export const Ok: S = { args: { value: 'DOKOON10', status: 'ok', message: 'کد تخفیف اعمال شد' } };
export const Err: S = { args: { value: 'ABC', status: 'err', message: 'کد تخفیف معتبر نیست' } };
