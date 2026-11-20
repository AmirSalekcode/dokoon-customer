import { render, screen } from '@testing-library/react';
import { server } from '@/mocks/node';
import { panelHandlers, resetPanelMockDb } from './mocks/handlers';
import { PanelApp } from './PanelApp';
import { signedIn } from './test/session';

describe('PanelApp', () => {
  it('boots the shell with the restaurant header', async () => {
    server.use(...panelHandlers);
    resetPanelMockDb();
    signedIn();
    render(<PanelApp />);
    expect(await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('رستوران');
  });
});
