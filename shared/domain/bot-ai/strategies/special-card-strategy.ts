/**
 * Special Card Strategy
 *
 * Bot decisions that only exist with expansion special cards:
 * - the suit/form announced with Cloud, Juggler and Shapeshifter
 * - trump (or no trump) after a Werewolf swap
 * - Juggler pass, Cloud bid change and Witch swap after a trick
 *
 * Decisions follow one intent: does the bot still need tricks to make its bid?
 */

import type { ICard } from '../../entities/card';
import type { Game } from '../../entities/game';
import type { Player } from '../../entities/player';
import { ALL_SUITS, CardType, type Suit } from '../../value-objects/card-types';
import { CardForm, DeclarationKind, TrickEffectKind, type ICardDeclaration } from '../../expansions/card-behavior';
import { getRequiredDeclaration } from '../../expansions/card-rules';
import {
  getAwaitingPlayerIds,
  isSwappableTrickCard,
  type PendingTrickEffect,
  type TrickEffectResponse,
} from '../../expansions/trick-effects';
import { preferredWinningSuit, toClassicCard } from '../classic-view';

const WIZARD_STRENGTH = 100;
const TRUMP_BONUS = 13;
/** Trumps from this value up count as likely trick winners. */
const HIGH_TRUMP_VALUE = 10;
const KING_VALUE = 13;

/** Tricks the player still needs to make the bid (negative when already over). */
function tricksNeeded(player: Player): number {
  return (player.bid ?? 0) - player.tricksWon;
}

function wantsTricks(player: Player): boolean {
  return player.bid !== null && tricksNeeded(player) > 0;
}

/**
 * Comparable strength of a card in the current round (higher wins more often).
 */
function cardStrength(card: ICard, game: Game, hand: readonly ICard[]): number {
  const classic = toClassicCard(card, undefined, {
    round: game.getRoundContext(),
    trumpSuit: game.trumpSuit,
    leadSuit: null,
    dragonInTrick: false,
    hand,
  });
  if (classic.type === CardType.WIZARD) return WIZARD_STRENGTH + (card.type === CardType.DRAGON ? 1 : 0);
  if (classic.type === CardType.JESTER) return 0;
  const trumpBonus = game.trumpSuit !== null && classic.suit === game.trumpSuit ? TRUMP_BONUS : 0;
  return (classic.value ?? 0) + trumpBonus;
}

function sortByStrength(cards: readonly ICard[], game: Game, hand: readonly ICard[]): ICard[] {
  return [...cards].sort((a, b) => cardStrength(a, game, hand) - cardStrength(b, game, hand));
}

/** Cards in hand likely to win a trick on their own: Wizard-like, high trumps, Kings. */
function estimateFutureWins(hand: readonly ICard[], game: Game): number {
  return hand.filter((card) => {
    const strength = cardStrength(card, game, hand);
    const isTrump = strength > TRUMP_BONUS && strength < WIZARD_STRENGTH && game.trumpSuit !== null;
    return strength >= WIZARD_STRENGTH ||
      (isTrump && strength - TRUMP_BONUS >= HIGH_TRUMP_VALUE) ||
      (!isTrump && strength >= KING_VALUE);
  }).length;
}

function losingSuit(trumpSuit: Suit | null, leadSuit: Suit | null): Suit {
  return ALL_SUITS.find((suit) => suit !== trumpSuit && suit !== leadSuit)
    ?? ALL_SUITS.find((suit) => suit !== trumpSuit)
    ?? ALL_SUITS[0];
}

export class SpecialCardStrategy {
  /**
   * Choice to announce with a card, or undefined when the card needs none.
   */
  declare(game: Game, playerId: string, card: ICard): ICardDeclaration | undefined {
    const player = game.getPlayer(playerId);
    const kind = getRequiredDeclaration(card, game.getRoundContext());
    if (!player || kind === null) return undefined;

    const leadSuit = game.currentTrick?.getLeadSuit() ?? null;
    if (kind === DeclarationKind.FORM) {
      return { form: wantsTricks(player) ? CardForm.WIZARD : CardForm.JESTER };
    }
    const suit = wantsTricks(player)
      ? preferredWinningSuit(player.hand, game.trumpSuit, leadSuit) ?? ALL_SUITS[0]
      : losingSuit(game.trumpSuit, leadSuit);
    return { suit };
  }

  /**
   * Trump after a Werewolf swap: the suit chosen by the regular trump strategy,
   * or no trump when the hand holds no suit cards worth backing.
   */
  chooseTrump(hand: readonly ICard[], allowNoTrump: boolean, preferredSuit: Suit): Suit | null {
    if (!allowNoTrump) return preferredSuit;
    const backing = hand.filter((card) => card.type === CardType.NUMBER && card.suit === preferredSuit).length;
    return backing === 0 ? null : preferredSuit;
  }

  /**
   * Answer to the active special-card effect for this bot, or null if it is not
   * waiting for this bot.
   */
  respond(game: Game, playerId: string, effect: PendingTrickEffect): TrickEffectResponse | null {
    const player = game.getPlayer(playerId);
    if (!player || !getAwaitingPlayerIds(effect).includes(playerId)) return null;

    switch (effect.kind) {
      case TrickEffectKind.PASS_LEFT:
        return this.choosePass(game, player);
      case TrickEffectKind.ADJUST_BID:
        return this.chooseBidAdjustment(game, player);
      case TrickEffectKind.SWAP_WITH_TRICK:
        return this.chooseSwap(game, player);
      default:
        return null;
    }
  }

  /** Keep what serves the bid: pass the weakest card when chasing tricks, else the strongest. */
  private choosePass(game: Game, player: Player): TrickEffectResponse | null {
    const sorted = sortByStrength(player.hand, game, player.hand);
    const card = wantsTricks(player) ? sorted[0] : sorted[sorted.length - 1];
    return card ? { kind: TrickEffectKind.PASS_LEFT, cardId: card.id } : null;
  }

  /** Move the bid towards the number of tricks the hand still looks likely to win. */
  private chooseBidAdjustment(game: Game, player: Player): TrickEffectResponse {
    const expected = estimateFutureWins(player.hand, game);
    const needed = tricksNeeded(player);
    const options: (1 | -1)[] = (player.bid ?? 0) > 0 ? [1, -1] : [1];
    const best = options.reduce((choice, delta) => {
      const distance = (d: number) => {
        const stillNeeded = needed + d;
        return stillNeeded < 0 ? Number.POSITIVE_INFINITY : Math.abs(stillNeeded - expected);
      };
      return distance(delta) < distance(choice) ? delta : choice;
    });
    return { kind: TrickEffectKind.ADJUST_BID, delta: best };
  }

  /** Take the card that serves the bid best and give the one that serves it least. */
  private chooseSwap(game: Game, player: Player): TrickEffectResponse | null {
    const trick = game.completedTricks[game.completedTricks.length - 1];
    const pile = sortByStrength((trick?.getPile() ?? []).filter(isSwappableTrickCard), game, player.hand);
    const hand = sortByStrength(player.hand, game, player.hand);
    if (pile.length === 0 || hand.length === 0) return null;

    const chasing = wantsTricks(player);
    const taken = chasing ? pile[pile.length - 1] : pile[0];
    const given = chasing ? hand[0] : hand[hand.length - 1];
    return { kind: TrickEffectKind.SWAP_WITH_TRICK, handCardId: given.id, trickCardId: taken.id };
  }
}
