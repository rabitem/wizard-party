import { useSyncExternalStore } from 'react';

/**
 * How far the realm room behind the start page is. `loading` until the canvas has settled and its
 * textures are in; `busy` while a realm switch loads the next room's textures; `unavailable` when
 * WebGL is missing or the room failed, so nothing waits on it. Written from inside the canvas,
 * read by the page's loader outside it.
 */
export type HallLoadingStatus = 'loading' | 'ready' | 'unavailable';

interface HallLoadingSnapshot {
  status: HallLoadingStatus;
  busy: boolean;
  /** A realm switch from the lenses is under way (see switchRealm) */
  switching: boolean;
  /** Name of the realm being switched to, while switching */
  target: string | null;
}

let snapshot: HallLoadingSnapshot = { status: 'loading', busy: false, switching: false, target: null };
const listeners = new Set<() => void>();

function update(next: Partial<HallLoadingSnapshot>): void {
  const merged = { ...snapshot, ...next };
  if (merged.status === snapshot.status && merged.busy === snapshot.busy && merged.switching === snapshot.switching && merged.target === snapshot.target) return;
  snapshot = merged;
  listeners.forEach((listener) => listener());
}

export const hallLoadingStore = {
  get: (): HallLoadingSnapshot => snapshot,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setStatus: (status: HallLoadingStatus) => update({ status }),
  setBusy: (busy: boolean) => update({ busy }),
};

/**
 * Switches realm behind a curtain: the loader shows first, and the switch, which builds the next
 * room and blocks the main thread for a moment, runs only once the loader has had time to paint
 * (HALL_LOADER.CURTAIN_MS). The curtain lifts after `minVisibleMs` and once the room's textures are in.
 */
export function switchRealm(apply: () => void, { target, curtainMs, minVisibleMs }: { target: string; curtainMs: number; minVisibleMs: number }): void {
  if (snapshot.status === 'unavailable') {
    apply();
    return;
  }
  update({ switching: true, target });
  setTimeout(() => {
    apply();
    const shownUntil = Date.now() + minVisibleMs;
    const lift = () => {
      if (snapshot.busy || Date.now() < shownUntil) setTimeout(lift, 120);
      else update({ switching: false, target: null });
    };
    setTimeout(lift, minVisibleMs);
  }, curtainMs);
}

const SERVER_SNAPSHOT: HallLoadingSnapshot = { status: 'loading', busy: false, switching: false, target: null };

export function useHallLoading(): HallLoadingSnapshot {
  return useSyncExternalStore(hallLoadingStore.subscribe, hallLoadingStore.get, () => SERVER_SNAPSHOT);
}
