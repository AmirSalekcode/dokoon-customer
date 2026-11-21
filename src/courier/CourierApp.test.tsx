import { render, screen } from '@testing-library/react';
import { CourierApp } from './CourierApp';

describe('CourierApp (empty shell, KAN-85)', () => {
  it('shows the courier title and the «پیک» tag on the header', () => {
    render(<CourierApp />);
    expect(screen.getByRole('heading', { level: 1, name: 'دکون پیک' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('پیک');
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
