import { render, screen } from '@testing-library/react';
import { PanelApp } from './PanelApp';

describe('PanelApp (empty shell)', () => {
  it('shows the restaurant title and the logo on the business header', () => {
    render(<PanelApp />);
    expect(screen.getByRole('heading', { level: 1, name: 'دکون رستوران' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('رستوران');
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
