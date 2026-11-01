/**
 * Bot action safety net
 *
 * A bot must never stall a table: whatever the brain answers is checked against
 * the game's own rules, and when the brain fails or answers something illegal the
 * bot falls back to a deterministic legal action instead.
 */

import {
  ALL_SUITS,
  CardType,
  DeclarationKind,
  GamePhase,
  TrickEffectKind,
  getDeclarationOptions,
  getRequiredDeclaration,
  isBidInRange,
  isSwappableTrickCard,
  type BidAdjustment,
  type CardForm,
  type Game,
  type ICardDeclaration,
  type Player,
  type Suit,
  type TrickEffectResponse,
} from '../../../domain';
import type { BotTurnOutput } from './bot-turn.types';

const BID_ADJUSTMENTS: readonly BidAdjustment[] = [1, -1];

/**
 * Whether the game would accept the action from that bot right now.
 */
export function isLegalBotAction(game: Game, action: BotTurnOutput): boolean {
  switch (action.type) {
    case 'SELECT_TRUMP':
      return game.phase === GamePhase.TRUMP_SELECTION &&
        game.getTrumpChooser()?.id === action.playerId &&
        (action.suit === null ? game.trumpChoice?.allowNoTrump === true : ALL_SUITS.includes(action.suit));
    case 'PLACE_BID':
      return game.phase === GamePhase.BIDDING &&
        game.getCurrentPlayer()?.id === action.playerId &&
        isBidInRange(action.bid, game.getCardsPerPlayerForCurrentRound()) &&
        action.bid !== game.getForbiddenBidFor(action.playerId);
    case 'PLAY_CARD':
      return game.getLegalPlays(action.playerId).some((card) => card.id === action.cardId) &&
        game.getDeclarationError(action.playerId, action.cardId, action.declaration) === null;
    case 'RESOLVE_EFFECT':
      return game.getEffectResponseError(action.playerId, action.response) === null;
    default:
      return true;
  }
}

/**
 * A deterministic legal action for the bot whose decision the game waits for:
 * the suit it holds most of, the lowest allowed bid, the first legal card, the
 * first acceptable effect response. NONE only when nothing is legal.
 */
export function fallbackBotAction(game: Game, bot: Player): BotTurnOutput {
  switch (game.phase) {
    case GamePhase.TRUMP_SELECTION:
      return { type: 'SELECT_TRUMP', playerId: bot.id, suit: mostHeldSuit(bot) };
    case GamePhase.BIDDING:
      return fallbackBid(game, bot);
    case GamePhase.PLAYING:
      return game.hasPendingEffects() ? fallbackEffectResponse(game, bot) : fallbackCard(game, bot);
    default:
      return { type: 'NONE' };
  }
}

function mostHeldSuit(bot: Player): Suit {
  let best: Suit = ALL_SUITS[0];
  let bestCount = -1;
  for (const suit of ALL_SUITS) {
    const count = bot.hand.filter((card) => card.type === CardType.NUMBER && card.suit === suit).length;
    if (count > bestCount) {
      best = suit;
      bestCount = count;
    }
  }
  return best;
}

function fallbackBid(game: Game, bot: Player): BotTurnOutput {
  const cards = game.getCardsPerPlayerForCurrentRound();
  const forbidden = game.getForbiddenBidFor(bot.id);
  for (let bid = 0; bid <= cards; bid++) {
    if (bid !== forbidden) return { type: 'PLACE_BID', playerId: bot.id, bid };
  }
  return { type: 'NONE' };
}

function fallbackCard(game: Game, bot: Player): BotTurnOutput {
  const card = game.getLegalPlays(bot.id)[0];
  if (!card) return { type: 'NONE' };

  const kind = getRequiredDeclaration(card, game.getRoundContext());
  if (kind === null) return { type: 'PLAY_CARD', playerId: bot.id, cardId: card.id };

  const [option] = getDeclarationOptions(kind);
  const declaration: ICardDeclaration = kind === DeclarationKind.SUIT
    ? { suit: option as Suit }
    : { form: option as CardForm };
  return { type: 'PLAY_CARD', playerId: bot.id, cardId: card.id, declaration };
}

function effectResponseCandidates(game: Game, bot: Player): TrickEffectResponse[] {
  const effect = game.getActiveEffect();
  if (!effect) return [];
  switch (effect.kind) {
    case TrickEffectKind.PASS_LEFT:
      return bot.hand.map((card): TrickEffectResponse => ({ kind: TrickEffectKind.PASS_LEFT, cardId: card.id }));
    case TrickEffectKind.ADJUST_BID:
      return BID_ADJUSTMENTS.map((delta): TrickEffectResponse => ({ kind: TrickEffectKind.ADJUST_BID, delta }));
    case TrickEffectKind.SWAP_WITH_TRICK: {
      const pile = (game.getLastCompletedTrick()?.getPile() ?? []).filter(isSwappableTrickCard);
      return bot.hand.flatMap((handCard) => pile.map((trickCard): TrickEffectResponse => ({
        kind: TrickEffectKind.SWAP_WITH_TRICK,
        handCardId: handCard.id,
        trickCardId: trickCard.id,
      })));
    }
    default:
      return [];
  }
}

function fallbackEffectResponse(game: Game, bot: Player): BotTurnOutput {
  const response = effectResponseCandidates(game, bot)
    .find((candidate) => game.getEffectResponseError(bot.id, candidate) === null);
  return response ? { type: 'RESOLVE_EFFECT', playerId: bot.id, response } : { type: 'NONE' };
}
