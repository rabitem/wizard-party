/**
 * Special Card Notices
 *
 * One-line, table-wide announcements of what special cards just did, built from
 * server events (pure, so it is unit tested and reused by every client).
 */

import {
  CardType,
  GameEventType,
  SUIT_NAMES,
  TrickEffectKind,
  getCardCatalogEntry,
  type IPlayer,
  type TrickEffectOutcome,
  type Suit,
} from '@shared/domain';

export interface SpecialCardNotice {
  id: string;
  /** The card the notice is about (used for its icon). */
  cardType: CardType;
  message: string;
  timestamp: number;
}

type NoticeEvent =
  | { type: GameEventType.TRICK_EFFECT_RESOLVED; outcome: TrickEffectOutcome; timestamp: number }
  | { type: GameEventType.TRICK_COMPLETE; winnerId: string; voided?: boolean; timestamp: number }
  | { type: GameEventType.TRUMP_SELECTED; trumpSuit: Suit | null; playerId?: string; timestamp: number };

function nameOf(players: readonly IPlayer[], id: string | undefined, localPlayerId: string | null): string {
  if (id && id === localPlayerId) return 'You';
  return players.find((p) => p.id === id)?.name ?? 'Someone';
}

function cardName(type: CardType): string {
  return getCardCatalogEntry(type).name;
}

function describeOutcome(outcome: TrickEffectOutcome, players: readonly IPlayer[], me: string | null) {
  switch (outcome.kind) {
    case TrickEffectKind.PASS_LEFT:
      return { cardType: CardType.JUGGLER, message: `${cardName(CardType.JUGGLER)}: everyone passed a card to the left` };
    case TrickEffectKind.ADJUST_BID: {
      const verb = outcome.delta > 0 ? 'raised' : 'lowered';
      return {
        cardType: CardType.CLOUD,
        message: `${cardName(CardType.CLOUD)}: ${nameOf(players, outcome.playerId, me)} ${verb} the bid to ${outcome.newBid}`,
      };
    }
    case TrickEffectKind.SWAP_WITH_TRICK:
      return {
        cardType: CardType.WITCH,
        message: `${cardName(CardType.WITCH)}: ${nameOf(players, outcome.playerId, me)} took the ${describeCard(outcome.takenCard)} from the trick`,
      };
    default:
      return null;
  }
}

export function describeCard(card: { type: CardType; suit: Suit | null; value: number | null }): string {
  if (card.type === CardType.NUMBER && card.suit) return `${SUIT_NAMES[card.suit]} ${card.value ?? ''}`.trim();
  return cardName(card.type);
}

/**
 * The notice an event produces, or null for events that are not about special cards.
 */
export function describeSpecialCardEvent(
  event: NoticeEvent,
  players: readonly IPlayer[],
  localPlayerId: string | null
): SpecialCardNotice | null {
  let described: { cardType: CardType; message: string } | null = null;

  if (event.type === GameEventType.TRICK_EFFECT_RESOLVED) {
    described = describeOutcome(event.outcome, players, localPlayerId);
  } else if (event.type === GameEventType.TRICK_COMPLETE && event.voided) {
    described = {
      cardType: CardType.BOMB,
      message: `${cardName(CardType.BOMB)}! Nobody wins the trick - ${nameOf(players, event.winnerId, localPlayerId)} leads next`,
    };
  } else if (event.type === GameEventType.TRUMP_SELECTED && event.trumpSuit === null) {
    described = {
      cardType: CardType.WEREWOLF,
      message: `${cardName(CardType.WEREWOLF)}: ${nameOf(players, event.playerId, localPlayerId)} declared no trump`,
    };
  }

  return described
    ? { id: `${event.type}-${event.timestamp}-${described.message}`, timestamp: event.timestamp, ...described }
    : null;
}
