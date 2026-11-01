import { describe, expect, it } from 'vitest';
import {
  CardType,
  DEFAULT_RULESET_CONFIG,
  DeclarationKind,
  GameEventType,
  GamePhase,
  Suit,
  TrickEffectKind,
  TrumpChoiceReason,
  type ICard,
  type IGameState,
  type IPlayer,
} from '@shared/domain';
import {
  getDeclarationCardLabel,
  getEffectPromptModel,
  getPlayDeclarationKind,
  getSpecialCardRoundInfo,
  getTrumpChoiceModel,
} from './special-card-view-model';
import { describeSpecialCardEvent } from './special-card-notices';

const card = (type: CardType, suit: Suit | null = null, value: number | null = null): ICard => ({
  id: suit ? `${suit}-${value}` : `${type}-0`,
  type,
  suit,
  value,
});

function player(id: string, overrides: Partial<IPlayer> = {}): IPlayer {
  return { id, name: id.toUpperCase(), hand: [], bid: 1, tricksWon: 0, score: 0, isConnected: true, isBot: false, roundHistory: [], ...overrides };
}

function state(overrides: Partial<IGameState> = {}): IGameState {
  return {
    id: 'room',
    phase: GamePhase.PLAYING,
    players: [player('p1', { hand: [card(CardType.NUMBER, Suit.ELVES, 3)] }), player('p2'), player('p3')],
    currentRound: 1,
    maxRounds: 20,
    trumpSuit: null,
    trumpCard: null,
    currentPlayerIndex: 0,
    dealerIndex: 0,
    currentTrick: null,
    completedTricks: [],
    bidsPlaced: 3,
    hostId: 'p1',
    forbiddenBid: null,
    ...overrides,
  };
}

describe('special card view models', () => {
  it('lets the Werewolf holder choose trump with a no-trump option', () => {
    const model = getTrumpChoiceModel(
      state({ trumpChoice: { playerId: 'p2', allowNoTrump: true, reason: TrumpChoiceReason.WEREWOLF } }),
      'p2'
    );
    expect(model).toEqual({ canChoose: true, chooserName: 'P2', allowNoTrump: true, reason: TrumpChoiceReason.WEREWOLF });
    expect(getTrumpChoiceModel(state(), 'p2').canChoose).toBe(false);
  });

  it('asks for a declaration only for cards that need one, including a copying Vampire', () => {
    const vampire = card(CardType.VAMPIRE);
    const copyingCloud = state({ expansionState: { copySource: card(CardType.CLOUD), setAsideCards: [], werewolfSwap: null } });
    expect(getPlayDeclarationKind(state(), card(CardType.CLOUD))).toBe(DeclarationKind.SUIT);
    expect(getPlayDeclarationKind(state(), card(CardType.SHAPESHIFTER))).toBe(DeclarationKind.FORM);
    expect(getPlayDeclarationKind(state(), card(CardType.DRAGON))).toBeNull();
    expect(getPlayDeclarationKind(copyingCloud, vampire)).toBe(DeclarationKind.SUIT);
    expect(getDeclarationCardLabel(copyingCloud, vampire)).toBe('Vampire as Cloud');
  });

  it('shows the Juggler pass prompt only to players who still have to pass', () => {
    const pending = state({
      pendingEffects: [{ kind: TrickEffectKind.PASS_LEFT, playerIds: ['p1', 'p2', 'p3'], selections: { p2: 'hidden' } }],
    });
    expect(getEffectPromptModel(pending, 'p1')).toMatchObject({ mode: TrickEffectKind.PASS_LEFT, recipientName: 'P2' });
    expect(getEffectPromptModel(pending, 'p2')).toMatchObject({ mode: 'WAITING' });
  });

  it('only offers lowering a Cloud bid above zero', () => {
    const pending = state({
      players: [player('p1', { bid: 0, tricksWon: 1 }), player('p2'), player('p3')],
      pendingEffects: [{ kind: TrickEffectKind.ADJUST_BID, playerId: 'p1' }],
    });
    expect(getEffectPromptModel(pending, 'p1')).toMatchObject({ mode: TrickEffectKind.ADJUST_BID, canLower: false });
  });

  it('never offers the Witch herself from the trick', () => {
    const witch = card(CardType.WITCH);
    const elves = card(CardType.NUMBER, Suit.ELVES, 9);
    const pending = state({
      completedTricks: [{ cards: [{ playerId: 'p1', card: witch }, { playerId: 'p2', card: elves }], leadSuit: Suit.ELVES, winnerId: 'p2' }],
      pendingEffects: [{ kind: TrickEffectKind.SWAP_WITH_TRICK, playerId: 'p1' }],
    });
    const model = getEffectPromptModel(pending, 'p1');
    expect(model.mode === TrickEffectKind.SWAP_WITH_TRICK && model.pile.map((c) => c.id)).toEqual(['ELVES-9']);
  });
});

describe('special card round info', () => {
  it('reminds the table of the Werewolf swap and what the Vampire copies', () => {
    const elves = card(CardType.NUMBER, Suit.ELVES, 7);
    const info = getSpecialCardRoundInfo(state({
      rulesetConfig: { ...DEFAULT_RULESET_CONFIG, expansions: { specialCards: [CardType.VAMPIRE, CardType.WEREWOLF] } },
      expansionState: { copySource: elves, setAsideCards: [], werewolfSwap: { playerId: 'p2', takenCard: elves } },
    }));
    expect(info.map((line) => line.text)).toEqual(['P2 took the Elves 7', 'copies the Elves 7']);
  });

  it('stays silent in a classic game', () => {
    expect(getSpecialCardRoundInfo(state({ expansionState: { copySource: card(CardType.WIZARD), setAsideCards: [], werewolfSwap: null } }))).toEqual([]);
  });
});

describe('special card notices', () => {
  const players = [player('p1'), player('p2')];

  it('announces a Bomb-voided trick and a Cloud bid change', () => {
    expect(describeSpecialCardEvent({ type: GameEventType.TRICK_COMPLETE, winnerId: 'p2', voided: true, timestamp: 1 }, players, 'p1')?.message)
      .toContain('Nobody wins the trick - P2 leads next');
    expect(describeSpecialCardEvent({
      type: GameEventType.TRICK_EFFECT_RESOLVED,
      outcome: { kind: TrickEffectKind.ADJUST_BID, playerId: 'p1', delta: 1, newBid: 3 },
      timestamp: 2,
    }, players, 'p1')?.message).toBe('Cloud: You raised the bid to 3');
  });

  it('ignores ordinary tricks', () => {
    expect(describeSpecialCardEvent({ type: GameEventType.TRICK_COMPLETE, winnerId: 'p2', timestamp: 1 }, players, 'p1')).toBeNull();
  });
});
