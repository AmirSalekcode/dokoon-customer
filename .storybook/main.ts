import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: { name: '@storybook/react-vite', options: {} },
  // Fonts are referenced from design-tokens/dokoon-tokens.css → ../assets/fonts (bundled by Vite).
  core: { disableTelemetry: true },
  // The app's PWA plugin is not needed inside Storybook.
  viteFinal: async (cfg) => ({
    ...cfg,
    plugins: (cfg.plugins ?? [])
      .flat()
      .filter(
        (p) => !(p && typeof p === 'object' && 'name' in p && String(p.name).startsWith('vite-plugin-pwa')),
      ),
  }),
};

export default config;
