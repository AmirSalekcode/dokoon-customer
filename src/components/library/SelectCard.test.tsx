import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectCard } from './SelectCard';

describe('<SelectCard />', () => {
  it('radio: accessible name is the title, subtitle is the description', () => {
    render(<SelectCard title="روشن" sub="همیشه روشن" radio selected />);
    const r = screen.getByRole('radio', { name: 'روشن' });
    expect(r).toHaveAccessibleName('روشن');
    expect(r).toHaveAccessibleDescription('همیشه روشن');
    expect(r).toHaveAttribute('aria-checked', 'true');
  });

  it('reports picks and disabled state', async () => {
    const onPick = vi.fn();
    const { rerender } = render(<SelectCard title="نقدی" radio onPick={onPick} />);
    await userEvent.click(screen.getByRole('radio', { name: 'نقدی' }));
    expect(onPick).toHaveBeenCalledOnce();
    rerender(<SelectCard title="نقدی" radio disabled onPick={onPick} />);
    expect(screen.getByRole('radio', { name: 'نقدی' })).toBeDisabled();
  });
});
