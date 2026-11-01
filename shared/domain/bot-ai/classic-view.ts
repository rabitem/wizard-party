/**
 * Classic View (anti-corruption layer for the bot AI)
 *
 * The bot algorithms (heuristics, Monte Carlo, ISMCTS, CFR, ...) reason about the
 * classic deck. Instead of teaching every algorithm every special card, the bot
 * sees each special card as the classic card it behaves like (keeping its id):
 *
 *   Dragon, Wizard-form Shapeshifter            -> Wizard
 *   Cloud / Juggler / suit-copying Vampire       -> number card (9.75 / 7.5 / copied)
 *   Fairy, Witch, Bomb, Werewolf, Jester-form    -> Jester
 *   Fairy in a trick that holds the Dragon       -> Wizard (she wins it)
 *
 * Unplayed suit-announcing cards are shown in the suit the bot would announce to
 * win (see special-card-strategy). Special-card choices themselves are made by the
 * SpecialCardStrategy against the real game.
 */

import { Card, ICard } from '../entities/card';
import { Game, type IGameState } from '../entities/game';
import type { ITrick, PlayedCard } from '../entities/trick';
import { CardType, isSpecialCardType, type Suit } from '../value-objects/card-types';
import { CardForm, DeclarationKind, TrickRank, type ICardDeclaration } from '../expansions/card-behavior';
import { getRequiredDeclaration, resolveCardBehavior, type ICardRoundContext } from '../expansions/card-rules';

/**
 * Suit the bot announces for a Cloud/Juggler it intends to win with:
 * trump, else the lead suit, else its own strongest suit.
 */
export function preferredWinningSuit(
  hand: readonly ICard[],
  trumpSuit: Suit | null,
  leadSuit: Suit | null
): Suit | null {
  if (trumpSuit) return trumpSuit;
  if (leadSuit) return leadSuit;
  const counts = new Map<Suit, number>();
  for (const card of hand) {
    if (card.type === CardType.NUMBER && card.suit) counts.set(card.suit, (counts.get(card.suit) ?? 0) + 1);
  }
  let best: Suit | null = null;
  for (const [suit, count] of counts) {
    if (best === null || count > (counts.get(best) ?? 0)) best = suit;
  }
  return best;
}

interface ViewContext {
  round: ICardRoundContext;
  trumpSuit: Suit | null;
  leadSuit: Suit | null;
  /** The Dragon lies in the trick being viewed, so a Fairy there wins. */
  dragonInTrick: boolean;
  hand: readonly ICard[];
}

function classicCard(card: ICard, type: CardType, suit: Suit | null = null, value: number | null = null): ICard {
  return { id: card.id, type, suit, value };
}

/**
 * The classic card a (possibly special) card behaves like.
 */
export function toClassicCard(card: ICard, declaration: ICardDeclaration | undefined, view: ViewContext): ICard {
  if (!isSpecialCardType(card.type)) return card;

  let effectiveDeclaration = declaration;
  if (!effectiveDeclaration) {
    const kind = getRequiredDeclaration(card, view.round);
    if (kind === DeclarationKind.SUIT) {
      const suit = preferredWinningSuit(view.hand, view.trumpSuit, view.leadSuit);
      effectiveDeclaration = suit ? { suit } : {};
    } else if (kind === DeclarationKind.FORM) {
      effectiveDeclaration = { form: CardForm.WIZARD };
    }
  }

  const behavior = resolveCardBehavior(card, effectiveDeclaration, view.round);
  switch (behavior.rank) {
    case TrickRank.DRAGON:
    case TrickRank.WIZARD:
      return classicCard(card, CardType.WIZARD);
    case TrickRank.SUITED:
      return behavior.suit
        ? classicCard(card, CardType.NUMBER, behavior.suit, behavior.value)
        : classicCard(card, CardType.JESTER);
    case TrickRank.FAIRY:
      return classicCard(card, view.dragonInTrick ? CardType.WIZARD : CardType.JESTER);
    default:
      return classicCard(card, CardType.JESTER);
  }
}

function viewTrick(trick: ITrick, base: Omit<ViewContext, 'dragonInTrick' | 'leadSuit'>): ITrick {
  const dragonInTrick = trick.cards.some(
    (played) => resolveCardBehavior(played.card, played.declaration, base.round).rank === TrickRank.DRAGON
  );
  const context: ViewContext = { ...base, leadSuit: trick.leadSuit, dragonInTrick };
  return {
    ...trick,
    cards: trick.cards.map((played): PlayedCard => ({
      playerId: played.playerId,
      card: toClassicCard(played.card, played.declaration, context),
    })),
    exchanges: [],
  };
}

function containsSpecialCards(state: IGameState): boolean {
  const isSpecial = (card: ICard | null | undefined) => !!card && isSpecialCardType(card.type);
  return (
    isSpecial(state.trumpCard) ||
    state.players.some((player) => player.hand.some(isSpecial)) ||
    (state.currentTrick?.cards.some((played) => isSpecial(played.card)) ?? false) ||
    state.completedTricks.some((trick) => trick.cards.some((played) => isSpecial(played.card)))
  );
}

/**
 * A copy of the game in which every special card is replaced by its classic
 * equivalent. Returns the game itself when no special card is involved.
 */
export function toClassicView(game: Game): Game {
  const state = game.toJSON();
  if (!containsSpecialCards(state)) return game;

  const round = game.getRoundContext();
  const leadSuit = game.currentTrick?.getLeadSuit() ?? null;
  const currentDragon = (game.currentTrick?.getResolvedPlays() ?? []).some(
    (play) => play.behavior.rank === TrickRank.DRAGON
  );

  const viewState: IGameState = {
    ...state,
    trumpCard: state.trumpCard
      ? toClassicCard(state.trumpCard, undefined, {
        round, trumpSuit: state.trumpSuit, leadSuit: null, dragonInTrick: false, hand: [],
      })
      : null,
    players: state.players.map((player) => ({
      ...player,
      hand: player.hand.map((card) =>
        toClassicCard(card, undefined, {
          round, trumpSuit: state.trumpSuit, leadSuit, dragonInTrick: currentDragon, hand: player.hand,
        })
      ),
    })),
    currentTrick: state.currentTrick
      ? viewTrick(state.currentTrick, { round, trumpSuit: state.trumpSuit, hand: [] })
      : null,
    completedTricks: state.completedTricks.map((trick) =>
      viewTrick(trick, { round, trumpSuit: state.trumpSuit, hand: [] })
    ),
    expansionState: null,
    pendingEffects: [],
  };

  return Game.fromJSON(viewState);
}

/**
 * The view counterparts of real cards (same ids), in the given order.
 */
export function mapToViewCards(viewGame: Game, playerId: string, cards: readonly Card[]): Card[] {
  const hand = viewGame.getPlayer(playerId)?.hand ?? [];
  return cards.map((card) => hand.find((viewCard) => viewCard.id === card.id) ?? card);
}
