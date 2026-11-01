import { describe, expect, it } from 'vitest';
import {
  createCardLandingLifecycle,
  markCardLanded,
  markCardsAlreadyLanded,
  syncExpectedCards,
} from './card-landing-lifecycle';

describe('card landing lifecycle', () => {
  it('does not notify all-landed before a pending trick result is waiting', () => {
    const lifecycle = createCardLandingLifecycle();

    expect(syncExpectedCards(lifecycle, ['card-a', 'card-b'], false)).toBe(false);
    expect(markCardLanded(lifecycle, 'card-a', false)).toBe(false);
    expect(markCardLanded(lifecycle, 'card-b', false)).toBe(false);

    expect(syncExpectedCards(lifecycle, ['card-a', 'card-b'], true)).toBe(true);
  });

  it('notifies immediately when static reconnect cards are already landed and a result is waiting', () => {
    const lifecycle = createCardLandingLifecycle();

    expect(syncExpectedCards(lifecycle, ['card-a', 'card-b', 'card-c'], false)).toBe(false);
    expect(markCardsAlreadyLanded(lifecycle, ['card-a', 'card-b', 'card-c'], false)).toBe(false);

    expect(syncExpectedCards(lifecycle, ['card-a', 'card-b', 'card-c'], true)).toBe(true);
  });

  it('notifies once for repeated reconnect/static marks of the same trick', () => {
    const lifecycle = createCardLandingLifecycle();

    expect(syncExpectedCards(lifecycle, ['card-a'], true)).toBe(false);
    expect(markCardsAlreadyLanded(lifecycle, ['card-a'], true)).toBe(true);
    expect(markCardsAlreadyLanded(lifecycle, ['card-a'], true)).toBe(false);
    expect(syncExpectedCards(lifecycle, ['card-a'], true)).toBe(false);
  });

  it('resets notification eligibility when a new card joins the trick', () => {
    const lifecycle = createCardLandingLifecycle();

    expect(syncExpectedCards(lifecycle, ['card-a'], true)).toBe(false);
    expect(markCardLanded(lifecycle, 'card-a', true)).toBe(true);

    expect(syncExpectedCards(lifecycle, ['card-a', 'card-b'], true)).toBe(false);
    expect(markCardLanded(lifecycle, 'card-b', true)).toBe(true);
  });

  it('does not shrink the expected card set while waiting for a completed trick to land', () => {
    const lifecycle = createCardLandingLifecycle();

    expect(syncExpectedCards(lifecycle, ['card-a', 'card-b', 'card-c', 'card-d'], true)).toBe(false);
    expect(markCardLanded(lifecycle, 'card-a', true)).toBe(false);
    expect(markCardLanded(lifecycle, 'card-b', true)).toBe(false);
    expect(markCardLanded(lifecycle, 'card-c', true)).toBe(false);

    expect(syncExpectedCards(lifecycle, ['card-a', 'card-b', 'card-c'], true)).toBe(false);
    expect(markCardLanded(lifecycle, 'card-d', true)).toBe(true);
  });
});
