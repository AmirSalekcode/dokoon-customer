import type { PermissionProvider, PermKind, PermState } from '../permissions/provider';

/** Test provider: fixed states; `request` answers with `answers[kind]` (default granted) and remembers it. */
export function fakePermissions(
  start: Partial<Record<PermKind, PermState>> = {},
  answers: Partial<Record<PermKind, PermState>> = {},
  kinds: readonly PermKind[] = ['location', 'notifications', 'battery'],
): PermissionProvider & { asked: PermKind[]; states: Record<PermKind, PermState> } {
  const states: Record<PermKind, PermState> = {
    location: 'prompt',
    notifications: 'prompt',
    battery: 'prompt',
    ...start,
  };
  const asked: PermKind[] = [];
  return {
    kinds,
    backgroundLocation: kinds.includes('battery'),
    states,
    asked,
    check: (k) => Promise.resolve(states[k]),
    request: (k) => {
      asked.push(k);
      states[k] = answers[k] ?? 'granted';
      return Promise.resolve(states[k]);
    },
  };
}

export const allGranted = () =>
  fakePermissions({ location: 'granted', notifications: 'granted', battery: 'granted' });
