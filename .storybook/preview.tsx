import type { Decorator, Preview } from '@storybook/react-vite';
import { useEffect, type ReactNode } from 'react';
import '../src/styles/global.css';
// App delta tokens are scoped to <html data-app="…">, so loading both is harmless until a story asks.
import '../design-tokens/dokoon-restaurant-tokens.css';
import '../design-tokens/dokoon-courier-tokens.css';
import { ArtSprite } from '../src/components/primitives/ArtSprite';

type App = 'customer' | 'restaurant' | 'courier';

/**
 * RTL + Persian + theme (toolbar) frame, 390 wide like the app's base frame. `parameters.app` picks the
 * restaurant or courier delta tokens (`data-app` on <html>), as the panel and courier entries do.
 */
function AppFrame({
  dark,
  full,
  app,
  children,
}: {
  dark: boolean;
  full: boolean;
  app: App;
  children: ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    if (app === 'customer') root.removeAttribute('data-app');
    else root.setAttribute('data-app', app);
    root.setAttribute('dir', 'rtl');
    root.setAttribute('lang', 'fa');
  }, [dark, app]);
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
  <AppFrame
    dark={ctx.globals.theme === 'dark'}
    full={ctx.parameters.frame === 'full'}
    app={(ctx.parameters.app as App | undefined) ?? 'customer'}
  >
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
