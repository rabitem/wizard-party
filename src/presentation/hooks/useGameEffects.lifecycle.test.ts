import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GamePhase, type IGameState } from '@shared/domain';
import { ROUND_WIN_SOUNDS } from '@/lib/sounds';
// Warm the module graph at collection time: the tests re-import it after vi.resetModules(), and a cold
// transform inside a test body can exceed the 5s test timeout when the full suite runs in parallel.
import './useGameEffects';

/** Last-round score per seat, in seat order; seats without one have an empty round history */
function createGameState(phase: GamePhase, lastRoundScores: readonly number[] = []): IGameState {
  const names = ['Merlin', 'Morgana', 'Nimue'];
  return {
    id: 'room-1',
    phase,
    players: names.map((name, index) => ({
      id: `player-${index + 1}`,
      name,
      hand: [],
      bid: null,
      tricksWon: 0,
      score: lastRoundScores[index] ?? 0,
      roundHistory: index < lastRoundScores.length ? [{ bid: 1, tricksWon: 1, score: lastRoundScores[index] }] : [],
      isHost: index === 0,
      isConnected: true,
      isBot: false,
    })),
    currentRound: 1,
    maxRounds: 2,
    dealerIndex: 0,
    currentPlayerIndex: 1,
    trumpSuit: null,
    currentTrick: null,
    bidsPlaced: 0,
    hostId: 'player-1',
    roomSettings: {
      name: 'Room',
      isPublic: true,
      maxPlayers: 6,
    },
  } as unknown as IGameState;
}

/**
 * Runs useGameEffects as successive renders of one component: refs persist between renders and
 * every effect runs on each render (each effect is guarded by its own previous-value refs).
 */
async function mountGameEffects(playerId = 'player-1') {
  const refs: Array<{ current: unknown }> = [];
  let refIndex = 0;

  vi.doMock('react', () => ({
    useRef: <T,>(initial: T) => {
      const index = refIndex;
      refIndex += 1;
      refs[index] ??= { current: initial };
      return refs[index];
    },
    useEffect: (effect: () => void | (() => void)) => {
      effect();
    },
  }));

  const { useGameEffects } = await import('./useGameEffects');
  const playedSounds: string[] = [];
  const GameEffectsHarness = ({ gameState, delayEndPhaseSounds }: { gameState: IGameState; delayEndPhaseSounds: boolean }) => {
    useGameEffects({
      gameState,
      playerId,
      emotes: [],
      playSound: (sound) => playedSounds.push(sound),
      delayEndPhaseSounds,
    });
  };
  const render = (gameState: IGameState, delayEndPhaseSounds = false) => {
    refIndex = 0;
    GameEffectsHarness({ gameState, delayEndPhaseSounds });
  };
  return { render, playedSounds };
}

describe('useGameEffects lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('react');
  });

  it('plays the card deal sound for every new bidding phase, not only the first round', async () => {
    const { render, playedSounds } = await mountGameEffects();

    render(createGameState(GamePhase.BIDDING));
    render(createGameState(GamePhase.PLAYING));
    render(createGameState(GamePhase.BIDDING));

    expect(playedSounds).toEqual(['cardDeal', 'cardDeal']);
  });

  it('delays round-end phase sounds until the trick animation has cleared', async () => {
    const { render, playedSounds } = await mountGameEffects();

    render(createGameState(GamePhase.PLAYING), false);
    render(createGameState(GamePhase.ROUND_END), true);
    expect(playedSounds).toEqual([]);

    render(createGameState(GamePhase.ROUND_END), false);
    expect(playedSounds).toEqual(['roundEnd']);
  });

  it.each([
    { seat: 'the single best round score', playerId: 'player-1', scores: [40, 20, -10], wins: true },
    { seat: 'a best round score tied with another player', playerId: 'player-2', scores: [30, 30, -10], wins: true },
    { seat: 'a round score below the best', playerId: 'player-3', scores: [30, 30, -10], wins: false },
  ] as const)('celebrates the round end for $seat', async ({ playerId, scores, wins }) => {
    const { render, playedSounds } = await mountGameEffects(playerId);

    render(createGameState(GamePhase.PLAYING));
    render(createGameState(GamePhase.ROUND_END, scores));

    expect(playedSounds).toHaveLength(1);
    if (wins) expect(ROUND_WIN_SOUNDS).toContain(playedSounds[0]);
    else expect(playedSounds[0]).toBe('roundEnd');
  });
});
