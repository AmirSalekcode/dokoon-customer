import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM script without type declarations
import { BUDGET, PAGES, failures } from './lighthouse.mjs';

describe('Lighthouse release budget (scripts/lighthouse.mjs)', () => {
  it('requires Performance and Accessibility ≥ 90 on mobile', () => {
    expect(BUDGET).toEqual({ performance: 90, accessibility: 90 });
  });

  it('audits every URL entry point: returning user, first visit, shared restaurant link', () => {
    expect(PAGES.map((p: { id: string }) => p.id)).toEqual(['home', 'first-visit', 'restaurant-link']);
    expect(PAGES.find((p: { id: string }) => p.id === 'restaurant-link').path).toMatch(/\?restaurant=/);
  });

  it('reports every category under budget (and missing scores)', () => {
    expect(failures({ performance: 95, accessibility: 92 })).toEqual([]);
    expect(failures({ performance: 89, accessibility: 92 })).toEqual(['performance 89 < 90']);
    expect(failures({ performance: 99 })).toEqual(['accessibility n/a < 90']);
  });
});
