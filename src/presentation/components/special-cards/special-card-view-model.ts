/**
 * Special Card View Models
 *
 * Pure functions that turn game state into what the special-card prompts show:
 * the trump choice (dealer or Werewolf holder), the declaration a card needs when
 * played, and the effect waiting after a trick (Juggler, Cloud, Witch).
 */

import {
  CardType,
  DeclarationKind,
  TrickEffectKind,
  Trick,
  TrumpChoiceReason,
  getCardCatalogEntry,
  getCardDefinition,
  getRequiredDeclaration,
  isSwappableTrickCard,
  type ICard,
  type IGameState,
  type IPlayer,
  type PendingTrickEffect,
} from '@shared/domain';
import { describeCard } from './special-card-notices';

// ============================================================================
// Trump choice
// ============================================================================

export interface TrumpChoiceModel {
  /** The local player decides trump. */
  canChoose: boolean;
  chooserName: string;
  /** "No trump" is a valid choice (Werewolf). */
  allowNoTrump: boolean;
  reason: TrumpChoiceReason;
}

export function getTrumpChoiceModel(state: IGameState, playerId: string): TrumpChoiceModel {
  const chooserId = state.trumpChoice?.playerId ?? state.players[state.dealerIndex]?.id;
  return {
    canChoose: chooserId === playerId,
    chooserName: state.players.find((p) => p.id === chooserId)?.name ?? 'The dealer',
    allowNoTrump: state.trumpChoice?.allowNoTrump ?? false,
    reason: state.trumpChoice?.reason ?? TrumpChoiceReason.REVEALED_CARD,
  };
}

// ============================================================================
// Declarations (Cloud, Juggler, Shapeshifter, copying Vampire)
// ============================================================================

export function getRoundContext(state: IGameState | null) {
  return { copySource: state?.expansionState?.copySource ?? null };
}

/** The choice playing this card needs, or null when it can be played straight away. */
export function getPlayDeclarationKind(state: IGameState | null, card: ICard | undefined): DeclarationKind | null {
  if (!card) return null;
  return getRequiredDeclaration(card, getRoundContext(state));
}

/** Name of the card whose rules apply (e.g. "Vampire as Cloud"). */
export function getDeclarationCardLabel(state: IGameState | null, card: ICard): string {
  const name = getCardCatalogEntry(card.type).name;
  const source = getRoundContext(state).copySource;
  return source && getCardDefinition(card.type).copiesTrumpCard
    ? `${name} as ${getCardCatalogEntry(source.type).name}`
    : name;
}

// ============================================================================
// Pending effects after a trick
// ============================================================================

export type EffectPromptModel =
  | { mode: 'NONE' }
  | { mode: 'WAITING'; kind: PendingTrickEffect['kind']; message: string }
  | { mode: TrickEffectKind.PASS_LEFT; recipientName: string; hand: ICard[] }
  | { mode: TrickEffectKind.ADJUST_BID; currentBid: number; canLower: boolean; tricksWon: number }
  | { mode: TrickEffectKind.SWAP_WITH_TRICK; hand: ICard[]; pile: ICard[] };

function nameOf(players: IPlayer[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? 'A player';
}

function awaitingIds(effect: PendingTrickEffect): string[] {
  return effect.kind === TrickEffectKind.PASS_LEFT
    ? effect.playerIds.filter((id) => !(id in effect.selections))
    : [effect.playerId];
}

function waitingMessage(effect: PendingTrickEffect, players: IPlayer[]): string {
  switch (effect.kind) {
    case TrickEffectKind.PASS_LEFT: {
      const names = awaitingIds(effect).map((id) => nameOf(players, id));
      return `Juggler: waiting for ${names.join(', ')} to pass a card`;
    }
    case TrickEffectKind.ADJUST_BID:
      return `Cloud: ${nameOf(players, effect.playerId)} changes their bid`;
    case TrickEffectKind.SWAP_WITH_TRICK:
      return `Witch: ${nameOf(players, effect.playerId)} swaps a card with the trick`;
    default:
      return 'Resolving a special card';
  }
}

/** Cards of the completed trick the Witch may take. */
export function getSwappableTrickCards(state: IGameState): ICard[] {
  const trick = state.completedTricks[state.completedTricks.length - 1];
  if (!trick) return [];
  return Trick.fromJSON(trick, state.trumpSuit).getPile().filter(isSwappableTrickCard);
}

export function getEffectPromptModel(state: IGameState, playerId: string): EffectPromptModel {
  const effect = state.pendingEffects?.[0];
  if (!effect) return { mode: 'NONE' };

  const me = state.players.find((p) => p.id === playerId);
  if (!me || !awaitingIds(effect).includes(playerId)) {
    return { mode: 'WAITING', kind: effect.kind, message: waitingMessage(effect, state.players) };
  }

  switch (effect.kind) {
    case TrickEffectKind.PASS_LEFT: {
      const seat = effect.playerIds.indexOf(playerId);
      const recipientId = effect.playerIds[(seat + 1) % effect.playerIds.length];
      return { mode: TrickEffectKind.PASS_LEFT, recipientName: nameOf(state.players, recipientId), hand: me.hand };
    }
    case TrickEffectKind.ADJUST_BID:
      return {
        mode: TrickEffectKind.ADJUST_BID,
        currentBid: me.bid ?? 0,
        canLower: (me.bid ?? 0) > 0,
        tricksWon: me.tricksWon,
      };
    case TrickEffectKind.SWAP_WITH_TRICK:
      return { mode: TrickEffectKind.SWAP_WITH_TRICK, hand: me.hand, pile: getSwappableTrickCards(state) };
    default:
      return { mode: 'NONE' };
  }
}

// ============================================================================
// Round info (public facts special cards add to a round)
// ============================================================================

export interface RoundInfoLine {
  cardType: CardType;
  text: string;
}

/**
 * What the table should remember this round: the Werewolf's swap and the card
 * the Vampire copies (only when the Vampire is in the deck).
 */
export function getSpecialCardRoundInfo(state: IGameState): RoundInfoLine[] {
  const lines: RoundInfoLine[] = [];
  const expansion = state.expansionState;
  if (!expansion) return lines;

  if (expansion.werewolfSwap) {
    lines.push({
      cardType: CardType.WEREWOLF,
      text: `${nameOf(state.players, expansion.werewolfSwap.playerId)} took the ${describeCard(expansion.werewolfSwap.takenCard)}`,
    });
  }
  const vampireInDeck = state.rulesetConfig?.expansions?.specialCards.includes(CardType.VAMPIRE) ?? false;
  if (vampireInDeck && expansion.copySource && expansion.copySource.type !== CardType.VAMPIRE) {
    lines.push({ cardType: CardType.VAMPIRE, text: `copies the ${describeCard(expansion.copySource)}` });
  }
  return lines;
}

export function hasPendingEffects(state: IGameState | null): boolean {
  return (state?.pendingEffects?.length ?? 0) > 0;
}
