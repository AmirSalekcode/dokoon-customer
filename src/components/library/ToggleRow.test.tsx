import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToggleRow } from './ToggleRow';

describe('<ToggleRow />', () => {
  it('is an accessible switch that reports clicks', async () => {
    const onFlip = vi.fn();
    render(<ToggleRow title="تم تیره" on={false} onFlip={onFlip} />);
    const sw = screen.getByRole('switch', { name: 'تم تیره' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(sw);
    expect(onFlip).toHaveBeenCalledOnce();
  });

  it('disabled: cannot be flipped', async () => {
    const onFlip = vi.fn();
    render(<ToggleRow title="ضروری" on disabled onFlip={onFlip} />);
    const sw = screen.getByRole('switch', { name: 'ضروری' });
    expect(sw).toBeDisabled();
    await userEvent.click(sw);
    expect(onFlip).not.toHaveBeenCalled();
  });
});
