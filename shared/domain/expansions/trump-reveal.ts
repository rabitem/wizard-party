/**
 * Trump Reveal
 *
 * Decides the round's trump after dealing: turns up cards (a Werewolf is set aside
 * and the next card turned up), applies the turned-up card's outcome and hands the
 * trump choice to a Werewolf holder, who swaps the Werewolf for the trump card.
 */

import type { ICard } from '../entities/card';
import type { Suit } from '../value-objects/card-types';
import { getCardDefinition, TrumpRevealOutcome } from './card-definitions';

export enum TrumpChoiceReason {
  /** A Wizard (or another dealer-chooses card) was turned up. */
  REVEALED_CARD = 'REVEALED_CARD',
  /** The Werewolf holder swapped it for the trump card. */
  WEREWOLF = 'WEREWOLF',
}

/** A pending trump decision: who decides and whether "no trump" is allowed. */
export interface ITrumpChoice {
  playerId: string;
  allowNoTrump: boolean;
  reason: TrumpChoiceReason;
}

export interface IWerewolfSwap {
  playerId: string;
  /** The turned-up card the holder took into their hand. */
  takenCard: ICard;
}

export interface TrumpRevealResult {
  /** The card shown as trump indicator (the Werewolf after a swap). */
  trumpCard: ICard | null;
  /** The card that determined trump at round start; the Vampire copies it. */
  copySource: ICard | null;
  /** Werewolves turned up and set aside for the round. */
  setAside: ICard[];
  trumpSuit: Suit | null;
  trumpChoice: ITrumpChoice | null;
  werewolfSwap: IWerewolfSwap | null;
}

export interface TrumpRevealInput {
  draw: () => ICard | null;
  dealerId: string;
  /** Hands in seat order, used to find a Werewolf holder. */
  hands: readonly { playerId: string; hand: readonly ICard[] }[];
}

function turnUpTrumpCard(draw: () => ICard | null): { card: ICard | null; setAside: ICard[] } {
  const setAside: ICard[] = [];
  let card = draw();
  while (card && getCardDefinition(card.type).trumpReveal === TrumpRevealOutcome.REVEAL_NEXT) {
    setAside.push(card);
    card = draw();
  }
  return { card, setAside };
}

function outcomeFor(card: ICard | null, dealerId: string): Pick<TrumpRevealResult, 'trumpSuit' | 'trumpChoice'> {
  if (!card) return { trumpSuit: null, trumpChoice: null };

  switch (getCardDefinition(card.type).trumpReveal) {
    case TrumpRevealOutcome.OWN_SUIT:
      return { trumpSuit: card.suit, trumpChoice: null };
    case TrumpRevealOutcome.DEALER_CHOOSES:
      return {
        trumpSuit: null,
        trumpChoice: { playerId: dealerId, allowNoTrump: false, reason: TrumpChoiceReason.REVEALED_CARD },
      };
    default:
      return { trumpSuit: null, trumpChoice: null };
  }
}

/**
 * Turn up the trump card and work out who decides trump. Does not mutate hands:
 * a returned werewolfSwap must be applied by the caller.
 */
export function revealTrump(input: TrumpRevealInput): TrumpRevealResult {
  const { card, setAside } = turnUpTrumpCard(input.draw);

  const holder = card
    ? input.hands.find(({ hand }) => hand.some((held) => getCardDefinition(held.type).swapsWithTrumpCard))
    : undefined;
  const werewolf = holder?.hand.find((held) => getCardDefinition(held.type).swapsWithTrumpCard);

  if (card && holder && werewolf) {
    return {
      trumpCard: werewolf,
      copySource: card,
      setAside,
      trumpSuit: null,
      trumpChoice: { playerId: holder.playerId, allowNoTrump: true, reason: TrumpChoiceReason.WEREWOLF },
      werewolfSwap: { playerId: holder.playerId, takenCard: card },
    };
  }

  return {
    trumpCard: card,
    copySource: card,
    setAside,
    ...outcomeFor(card, input.dealerId),
    werewolfSwap: null,
  };
}
