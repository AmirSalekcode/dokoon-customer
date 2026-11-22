/**
 * Device permissions of the courier app (KAN-92, courier screen specs «مجوزهای دستگاه»). Screens talk to a
 * `PermissionProvider`; the web one lives here, the Android (Capacitor) one arrives in KAN-104 and is set
 * with `setPermissionProvider` at start.
 */
export type PermKind = 'location' | 'notifications' | 'battery';
/** `prompt` = not asked yet; `unsupported` = this device/browser cannot give it at all. */
export type PermState = 'granted' | 'denied' | 'prompt' | 'unsupported';
export type PermStates = Record<PermKind, PermState>;

export interface PermissionProvider {
  /** Kinds this platform can ask for (the web has no battery setting). */
  kinds: readonly PermKind[];
  /** Background location exists (Android service); the web and iOS only track while open. */
  backgroundLocation: boolean;
  check: (kind: PermKind) => Promise<PermState>;
  request: (kind: PermKind) => Promise<PermState>;
}

type PermissionName = 'geolocation' | 'notifications';
async function queryPermission(name: PermissionName): Promise<PermState | null> {
  try {
    const st = await navigator.permissions?.query({ name } as PermissionDescriptor);
    if (!st) return null;
    return st.state === 'granted' ? 'granted' : st.state === 'denied' ? 'denied' : 'prompt';
  } catch {
    return null;
  }
}

const hasGeo = () => typeof navigator !== 'undefined' && !!navigator.geolocation;
const hasNotif = () => typeof window !== 'undefined' && 'Notification' in window;
const fromNotif = (p: NotificationPermission): PermState =>
  p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt';

/** Browser / PWA: Geolocation and Notification APIs; battery is not a web setting. */
export const webPermissionProvider: PermissionProvider = {
  kinds: ['location', 'notifications'],
  backgroundLocation: false,
  async check(kind) {
    if (kind === 'location') {
      if (!hasGeo()) return 'unsupported';
      return (await queryPermission('geolocation')) ?? 'prompt';
    }
    if (kind === 'notifications') {
      if (!hasNotif()) return 'unsupported';
      // The Permissions API first: some engines (headless/emulated Chromium) leave
      // `Notification.permission` at «denied» while the site is allowed.
      return (await queryPermission('notifications')) ?? fromNotif(Notification.permission);
    }
    return 'unsupported';
  },
  request(kind) {
    if (kind === 'location') {
      if (!hasGeo()) return Promise.resolve('unsupported');
      // Asking for one position is how a page asks for location; any answer but «denied» means allowed.
      return new Promise((resolve) =>
        navigator.geolocation.getCurrentPosition(
          () => resolve('granted'),
          (err) => resolve(err.code === err.PERMISSION_DENIED ? 'denied' : 'granted'),
          { maximumAge: 60_000, timeout: 20_000 },
        ),
      );
    }
    if (kind === 'notifications') {
      if (!hasNotif()) return Promise.resolve('unsupported');
      return Notification.requestPermission().then(fromNotif, () => 'denied' as const);
    }
    return Promise.resolve('unsupported');
  },
};

let provider: PermissionProvider = webPermissionProvider;
export const permissionProvider = () => provider;
/** Android app start (KAN-104) and tests. */
export function setPermissionProvider(p: PermissionProvider) {
  provider = p;
}

/**
 * Work can start only with location and notifications (screen specs). Notifications a browser cannot give at
 * all (iPhone Safari before «Add to Home Screen», iOS < 16.4) do not lock the courier out: the in-app alert
 * still sounds while the app is open, and the page says so.
 */
export const isSatisfied = (kind: PermKind, st: PermState) =>
  kind === 'location' ? st === 'granted' : kind === 'notifications' ? st !== 'prompt' && st !== 'denied' : true;

export async function checkAll(p: PermissionProvider = provider): Promise<PermStates> {
  const [location, notifications, battery] = await Promise.all(
    (['location', 'notifications', 'battery'] as const).map((k) =>
      p.kinds.includes(k) ? p.check(k).catch(() => 'prompt' as const) : Promise.resolve('unsupported' as const),
    ),
  );
  return { location, notifications, battery };
}

/** Location and notifications are in place (the battery exemption is recommended, never required). */
export const canWork = (s: PermStates) =>
  isSatisfied('location', s.location) && isSatisfied('notifications', s.notifications);

/** iPhone/iPad in a browser or installed PWA (iPadOS reports a Mac with touch). */
export const isIos = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
