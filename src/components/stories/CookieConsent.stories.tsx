import type { Meta, StoryObj } from '@storybook/react-vite';
import { useConsent } from '@/consent/consent';
import { CookieConsent } from '@/consent/CookieConsent';

const meta = {
  title: 'App/CookieConsent',
  component: CookieConsent,
  parameters: { frame: 'full', layout: 'fullscreen' },
  render: () => {
    useConsent.getState().reset();
    return (
      <div style={{ position: 'relative', height: 640 }}>
        <CookieConsent />
      </div>
    );
  },
} satisfies Meta<typeof CookieConsent>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
