/* eslint-disable react-hooks/rules-of-hooks */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IPlayer } from '@shared/domain';
import { resolveDisplayStandings, type DisplayStandings } from './useDisplayStandings';

function player(id: string, overrides: Partial<IPlayer> = {}): IPlayer {
  return {
    id,
    name: id,
    hand: [],
    bid: 1,
    tricksWon: 0,
    score: 0,
    isConnected: true,
    isBot: false,
    roundHistory: [],
    ...overrides,
  };
}

const preTrick: DisplayStandings = {
  players: [player('merlin'), player('morgana')],
  currentPlayerIndex: 1,
};

const postTrick: DisplayStandings = {
  players: [
    player('merlin', { tricksWon: 1, score: 30, roundHistory: [{ bid: 1, tricksWon: 1, score: 30 }] }),
    player('morgana', { score: -10, isConnected: false }),
  ],
  currentPlayerIndex: 0,
};

describe('resolveDisplayStandings', () => {
  it('should show the live standings when no trick result is pending', () => {
    expect(resolveDisplayStandings(postTrick, preTrick, false)).toBe(postTrick);
  });

  it('should hold trick outcome and turn while the trick result is pending', () => {
    const display = resolveDisplayStandings(postTrick, preTrick, true);

    expect(display.currentPlayerIndex).toBe(1);
    expect(display.players.map((p) => [p.id, p.tricksWon, p.score, p.roundHistory.length])).toEqual([
      ['merlin', 0, 0, 0],
      ['morgana', 0, 0, 0],
    ]);
  });

  it('should keep non-outcome player fields live while holding', () => {
    const display = resolveDisplayStandings(postTrick, preTrick, true);

    expect(display.players[1].isConnected).toBe(false);
  });

  it('should show players without a held entry as they are', () => {
    const joined = player('nimue', { score: 50 });
    const display = resolveDisplayStandings({ ...postTrick, players: [...postTrick.players, joined] }, preTrick, true);

    expect(display.players[2]).toBe(joined);
  });
});

describe('useDisplayStandings', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('react');
  });

  async function loadHook() {
    const states: unknown[] = [];
    let stateIndex = 0;
    let rerenderRequested = false;

    vi.resetModules();
    vi.doMock('react', () => ({
      useState: <T,>(initial: T) => {
        const index = stateIndex;
        stateIndex += 1;
        if (states[index] === undefined) states[index] = initial;
        const setState = (next: T) => {
          states[index] = next;
          rerenderRequested = true;
        };
        return [states[index], setState] as const;
      },
      useMemo: <T,>(factory: () => T) => factory(),
    }));

    const { useDisplayStandings } = await import('./useDisplayStandings');

    // Mirrors React re-running a component that set its own state during render.
    return (live: DisplayStandings, pending: boolean): DisplayStandings => {
      let result: DisplayStandings;
      do {
        rerenderRequested = false;
        stateIndex = 0;
        result = useDisplayStandings(live.players, live.currentPlayerIndex, pending);
      } while (rerenderRequested);
      return result;
    };
  }

  it('should reveal the trick outcome only once the trick result is no longer pending', async () => {
    const render = await loadHook();

    expect(render(preTrick, false).players[0].tricksWon).toBe(0);
    // TRICK_COMPLETE: pending is set before the post-trick GAME_STATE lands
    expect(render(preTrick, true).players[0].tricksWon).toBe(0);
    const whileLanding = render(postTrick, true);
    expect(whileLanding.players[0].tricksWon).toBe(0);
    expect(whileLanding.currentPlayerIndex).toBe(1);
    // Banner shows: the outcome is revealed with it
    const revealed = render(postTrick, false);
    expect(revealed.players[0].tricksWon).toBe(1);
    expect(revealed.currentPlayerIndex).toBe(0);
  });

  it('should hold the pre-trick standings when TRICK_COMPLETE and GAME_STATE land in one render', async () => {
    const render = await loadHook();

    render(preTrick, false);
    const batched = render(postTrick, true);

    expect(batched.players[0].score).toBe(0);
    expect(batched.currentPlayerIndex).toBe(1);
  });
});
