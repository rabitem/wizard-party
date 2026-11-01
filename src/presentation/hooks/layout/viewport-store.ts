import { RESPONSIVE_CONFIG } from '@/presentation/config/responsive.config';
import type { LayoutProfile } from '@/presentation/types/hud-layout.types';
import { createLayoutProfile, isSameLayoutProfile } from './layout-policy';

type Listener = () => void;

/**
 * One shared external store for the viewport profile. Every `useLayoutProfile` reads the same
 * snapshot through useSyncExternalStore, so the first client render is already correct and the
 * browser listeners exist once however many components subscribe.
 */
export interface ViewportStore {
  subscribe: (listener: Listener) => () => void;
  getSnapshot: () => LayoutProfile;
  getServerSnapshot: () => LayoutProfile;
}

export function createViewportStore(getWindow: () => Window | undefined): ViewportStore {
  const serverProfile: LayoutProfile = RESPONSIVE_CONFIG.SERVER_PROFILE;
  const listeners = new Set<Listener>();
  let snapshot: LayoutProfile | null = null;
  // Created once: MediaQueryList.matches is live, so reading it stays cheap
  let pointerQuery: MediaQueryList | null | undefined;
  let detach: (() => void) | null = null;

  const getPointerQuery = (win: Window): MediaQueryList | null => {
    if (pointerQuery === undefined) {
      pointerQuery = typeof win.matchMedia === 'function'
        ? win.matchMedia(RESPONSIVE_CONFIG.MEDIA_QUERIES.COARSE_POINTER)
        : null;
    }
    return pointerQuery;
  };

  /** Current profile; the cached object is kept while nothing changed (identity matters). */
  const read = (): LayoutProfile => {
    const win = getWindow();
    if (!win) return serverProfile;
    const coarsePointer = getPointerQuery(win)?.matches ?? false;
    const next = createLayoutProfile(win.innerWidth, win.innerHeight, coarsePointer);
    if (!snapshot || !isSameLayoutProfile(snapshot, next)) snapshot = next;
    return snapshot;
  };

  const notifyIfChanged = () => {
    const previous = snapshot;
    if (read() !== previous) listeners.forEach((listener) => listener());
  };

  const attach = (win: Window) => {
    const query = getPointerQuery(win);
    win.addEventListener('resize', notifyIfChanged);
    win.addEventListener('orientationchange', notifyIfChanged);
    query?.addEventListener?.('change', notifyIfChanged);
    return () => {
      win.removeEventListener('resize', notifyIfChanged);
      win.removeEventListener('orientationchange', notifyIfChanged);
      query?.removeEventListener?.('change', notifyIfChanged);
    };
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      const win = getWindow();
      if (!detach && win) detach = attach(win);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && detach) {
          detach();
          detach = null;
        }
      };
    },
    getSnapshot: read,
    getServerSnapshot: () => serverProfile,
  };
}

/** The app-wide viewport store. */
export const viewportStore = createViewportStore(() => (typeof window === 'undefined' ? undefined : window));
