import { describe, expect, it } from 'vitest';
import {
  buildCollectingAnimationKey,
  createCollectingCompletionLifecycle,
  markCollectingCardComplete,
  startCollectingCompletion,
} from './collecting-animation-lifecycle';

const cards = (...ids: string[]) =>
  ids.map((id, index) => ({
    playerId: `player-${index}`,
    card: { id },
  }));

describe('collecting animation lifecycle', () => {
  it('uses card identity, not only winner identity, so consecutive wins by the same player animate', () => {
    expect(buildCollectingAnimationKey('winner-a', cards('card-1', 'card-2'))).not.toBe(
      buildCollectingAnimationKey('winner-a', cards('card-3', 'card-4'))
    );
  });

  it('keeps duplicate delivery of the same completed trick idempotent', () => {
    expect(buildCollectingAnimationKey('winner-a', cards('card-2', 'card-1'))).toBe(
      buildCollectingAnimationKey('winner-a', cards('card-1', 'card-2'))
    );
  });

  it('does not build a collection key before there is a winner and cards', () => {
    expect(buildCollectingAnimationKey(null, cards('card-1'))).toBeNull();
    expect(buildCollectingAnimationKey('winner-a', null)).toBeNull();
  });

  it('waits for unique card completions instead of counting duplicate callbacks', () => {
    const lifecycle = createCollectingCompletionLifecycle();

    startCollectingCompletion(lifecycle, 'winner-a:card-a|card-b', ['card-a', 'card-b']);

    expect(markCollectingCardComplete(lifecycle, 'card-a')).toBe(false);
    expect(markCollectingCardComplete(lifecycle, 'card-a')).toBe(false);
    expect(markCollectingCardComplete(lifecycle, 'card-b')).toBe(true);
  });

  it('fires collection completion only once for a card set', () => {
    const lifecycle = createCollectingCompletionLifecycle();

    startCollectingCompletion(lifecycle, 'winner-a:card-a', ['card-a']);

    expect(markCollectingCardComplete(lifecycle, 'card-a')).toBe(true);
    expect(markCollectingCardComplete(lifecycle, 'card-a')).toBe(false);
  });

  it('restarts completion when the collection identity changes even with the same card ids', () => {
    const lifecycle = createCollectingCompletionLifecycle();

    startCollectingCompletion(lifecycle, 'winner-a:card-a', ['card-a']);
    expect(markCollectingCardComplete(lifecycle, 'card-a')).toBe(true);

    startCollectingCompletion(lifecycle, 'winner-b:card-a', ['card-a']);
    expect(markCollectingCardComplete(lifecycle, 'card-a')).toBe(true);
  });
});
