'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';

export interface ReadableStore<T> {
  getState(): T;
  subscribe(listener: () => void): () => void;
}

/**
 * A minimal external store for client state that changes outside React (socket messages,
 * animation callbacks). Components read it through `useStoreSelector`, so each one re-renders only
 * when the slice it selects changes, not whenever anything in the store does.
 */
export class ExternalStore<T> implements ReadableStore<T> {
  private readonly listeners = new Set<() => void>();

  constructor(private state: T) {}

  getState = (): T => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Replaces the state (or a part of it, via the updater) and notifies only when it changed. */
  update(updater: (state: T) => T): void {
    const next = updater(this.state);
    if (Object.is(next, this.state)) return;
    this.state = next;
    for (const listener of [...this.listeners]) listener();
  }
}

/**
 * Subscribes to a slice of a store. The slice is compared with `isEqual` (identity by default), so
 * a selector may derive a value as long as equal results compare equal. Pass a stable selector (a
 * module-level function or a memoized one): the last selection is cached per store state.
 */
export function useStoreSelector<T, S>(
  store: ReadableStore<T>,
  selector: (state: T) => S,
  isEqual: (a: S, b: S) => boolean = Object.is
): S {
  const cacheRef = useRef<{ state: T; selection: S } | null>(null);
  const getSnapshot = useCallback((): S => {
    const state = store.getState();
    const cached = cacheRef.current;
    if (cached && Object.is(cached.state, state)) return cached.selection;
    const selection = selector(state);
    const stable = cached && isEqual(cached.selection, selection) ? cached.selection : selection;
    cacheRef.current = { state, selection: stable };
    return stable;
  }, [store, selector, isEqual]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
