import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TextField } from '../base/TextField';

const meta = { title: 'Base/TextField', component: TextField } satisfies Meta<typeof TextField>;
export default meta;
type S = StoryObj<typeof meta>;

export const Name: S = {
  args: { label: 'نام', value: '', onChange: () => {} },
  render: (a) => {
    const [v, setV] = useState('امیر');
    return <TextField {...a} value={v} onChange={setV} />;
  },
};

export const PhoneNumeric: S = {
  args: {
    label: 'شماره‌ی موبایل',
    value: '',
    onChange: () => {},
    numeric: true,
    maxDigits: 11,
    autoComplete: 'tel',
    size: 'lg',
  },
  render: (a) => {
    const [v, setV] = useState('0913');
    return <TextField {...a} value={v} onChange={setV} hint={`مقدار ارسالی: ${v}`} />;
  },
};

export const WithError: S = {
  args: {
    label: 'شماره‌ی موبایل',
    value: '0812',
    onChange: () => {},
    numeric: true,
    error: 'شماره نامعتبر است',
  },
};
