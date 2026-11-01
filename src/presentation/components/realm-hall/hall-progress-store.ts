import type { HallProgress } from './hall-path';

/** Attribute that marks a page section as a stop of the walk, in document order. */
export const HALL_STATION_ATTRIBUTE = 'data-hall-station';

type Listener = (progress: HallProgress) => void;

let current: HallProgress = 0;
const listeners = new Set<Listener>();

/**
 * Walk progress, written by the page's scroll and read by the 3D camera inside useFrame, so a
 * scroll never re-renders React.
 */
export const hallProgressStore = {
  get: (): HallProgress => current,
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  set(next: HallProgress): void {
    if (next === current) return;
    current = next;
    listeners.forEach((listener) => listener(next));
  },
};
