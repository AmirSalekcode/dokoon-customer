## What

<!-- One feature per PR. Link the screen spec section if this is a screen. -->

## Checklist

- [ ] Tests were written first (TDD) and are green: `npm test`, `npm run e2e`
- [ ] Screen done criteria: loading / empty / error / offline, dark theme, RTL + Persian digits, back, 390×844
- [ ] k6 speed test added/updated (`perf/pages/<screen>.js`) and passing
- [ ] No secrets in code (`npm run secrets:scan`); new config goes through `src/config/env.ts` and `.env.example`
- [ ] Only design tokens (no hard-coded colors/spacings)
- [ ] `.cloud/decisions.md` updated if a decision was made
- [ ] Docs / changelog updated if behavior changed

## Screenshots (light / dark)
