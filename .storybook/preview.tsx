import type { Decorator, Preview } from '@storybook/react-vite';
import { useEffect, type ReactNode } from 'react';
import '../src/styles/global.css';
import { ArtSprite } from '../src/components/primitives/ArtSprite';

/** RTL + Persian + theme (toolbar) frame, 390 wide like the app's base frame. */
function AppFrame({ dark, full, children }: { dark: boolean; full: boolean; children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    root.setAttribute('dir', 'rtl');
    root.setAttribute('lang', 'fa');
  }, [dark]);
  return (
    <div
      dir="rtl"
      lang="fa"
      style={{
        position: 'relative',
        width: 390,
        maxWidth: '100%',
        minHeight: full ? 640 : undefined,
        background: 'var(--bg)',
        padding: full ? 0 : 16,
      }}
    >
      <ArtSprite />
      {children}
    </div>
  );
}

const withApp: Decorator = (Story, ctx) => (
  <AppFrame dark={ctx.globals.theme === 'dark'} full={ctx.parameters.frame === 'full'}>
    <Story />
  </AppFrame>
);

const preview: Preview = {
  decorators: [withApp],
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'روشن' },
          { value: 'dark', title: 'تیره' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
    backgrounds: { disable: true },
  },
};

export default preview;
