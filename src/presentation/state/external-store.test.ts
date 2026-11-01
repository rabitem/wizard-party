import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExternalStore, useStoreSelector } from './external-store';

/**
 * Just enough of React's hook runtime to render one component repeatedly in node: refs persist
 * across renders, and useSyncExternalStore reads the snapshot twice and fails like React does
 * ("The result of getSnapshot should be cached") when the two reads differ.
 */
const hooks = vi.hoisted(() => ({ refs: [] as { current: unknown }[], cursor: 0 }));

vi.mock('react', () => ({
  useRef: (initial: unknown) => {
    const slot = (hooks.refs[hooks.cursor] ??= { current: initial });
    hooks.cursor++;
    return slot;
  },
  useCallback: <F>(callback: F) => callback,
  useSyncExternalStore: <S>(_subscribe: unknown, getSnapshot: () => S) => {
    const first = getSnapshot();
    if (!Object.is(first, getSnapshot())) throw new Error('The result of getSnapshot should be cached');
    return first;
  },
}));

function render<S>(read: () => S): S {
  hooks.cursor = 0;
  return read();
}

describe('ExternalStore', () => {
  it('should notify subscribers only when the state changed', () => {
    const store = new ExternalStore({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.update((state) => state);
    store.update((state) => ({ count: state.count + 1 }));
    unsubscribe();
    store.update((state) => ({ count: state.count + 1 }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().count).toBe(2);
  });

  it('should let a listener unsubscribe while being notified', () => {
    const store = new ExternalStore(0);
    const second = vi.fn();
    const unsubscribeFirst = store.subscribe(() => unsubscribeFirst());
    store.subscribe(second);

    store.update((value) => value + 1);
    store.update((value) => value + 1);

    expect(second).toHaveBeenCalledTimes(2);
  });
});

describe('useStoreSelector', () => {
  interface TableState {
    players: { id: string; ready: boolean }[];
    chat: string[];
  }

  const readyIds = (state: TableState) => state.players.filter((player) => player.ready).map((player) => player.id);
  const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, index) => id === b[index]);

  let store: ExternalStore<TableState>;

  beforeEach(() => {
    hooks.refs = [];
    store = new ExternalStore<TableState>({ players: [{ id: 'ada', ready: true }, { id: 'bob', ready: false }], chat: [] });
  });

  it('should return a derived selection that is stable while the state is unchanged', () => {
    const first = render(() => useStoreSelector(store, readyIds));
    const second = render(() => useStoreSelector(store, readyIds));

    expect(first).toEqual(['ada']);
    expect(second).toBe(first);
  });

  it('should keep the previous selection when an unrelated change leaves the slice equal', () => {
    const before = render(() => useStoreSelector(store, readyIds, sameIds));

    store.update((state) => ({ ...state, chat: [...state.chat, 'hello'] }));
    const after = render(() => useStoreSelector(store, readyIds, sameIds));

    expect(after).toBe(before);
  });

  it('should return the new selection when the selected slice changes', () => {
    render(() => useStoreSelector(store, readyIds, sameIds));

    const allReady = (state: TableState): TableState => ({ ...state, players: state.players.map((player) => ({ ...player, ready: true })) });
    store.update(allReady);

    expect(render(() => useStoreSelector(store, readyIds, sameIds))).toEqual(['ada', 'bob']);
  });
});
