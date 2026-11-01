import { CardType, ICard, shouldShowBids } from "../../shared/domain";
import { isLegalBotAction, type BotTurnOutput } from "../../shared/application";
import { WIZARD_SOUNDS, JESTER_SOUNDS, type ServerContext } from "../utils/types";
import { getRandomSound } from "../utils/helpers";
import { broadcastPlayCardOutput, broadcastResolveEffectOutput } from "../handlers/game-result-broadcast";
import { ROOM_TIMING } from "../config/room-timing.config";

/** Pause before a bot moves (see ROOM_TIMING). */
export const BOT_ACTION_DELAY_MS = ROOM_TIMING.BOT_ACTION_DELAY_MS;

/**
 * A move the room makes on its own: a bot's turn, or the move for a player whose turn timer ran
 * out. Applied exactly like the same move sent by a player (same use cases, same events).
 */
export type AutomaticMove = Exclude<BotTurnOutput, { type: 'NONE' }>;

/**
 * What a bot turn did: moved the game on, found nobody to act (another phase, a human's turn, a
 * paused table), or could not move at all (the room's scheduler retries with backoff).
 */
export type BotTurnOutcome = 'acted' | 'idle' | 'failed';

function getCardSound(card: ICard | undefined): string | undefined {
  if (card?.type === CardType.WIZARD) return getRandomSound(WIZARD_SOUNDS);
  if (card?.type === CardType.JESTER) return getRandomSound(JESTER_SOUNDS);
  return undefined;
}

function applySelectTrump(ctx: ServerContext, move: Extract<AutomaticMove, { type: 'SELECT_TRUMP' }>): void {
  const result = ctx.useCases.selectTrump.execute({ game: ctx.game, playerId: move.playerId, suit: move.suit });
  ctx.broadcast(result.trumpSelectedEvent);
}

function applyPlaceBid(ctx: ServerContext, move: Extract<AutomaticMove, { type: 'PLACE_BID' }>): void {
  const result = ctx.useCases.placeBid.execute({ game: ctx.game, playerId: move.playerId, bid: move.bid });
  if (shouldShowBids(ctx.game.rulesetConfig.bidding, result.allBidsPlaced)) {
    ctx.broadcast(result.bidPlacedEvent);
  }
}

function applyPlayCard(ctx: ServerContext, move: Extract<AutomaticMove, { type: 'PLAY_CARD' }>): void {
  const card = ctx.game.getPlayer(move.playerId)?.hand.find((c) => c.id === move.cardId);
  const result = ctx.useCases.playCard.execute({
    game: ctx.game,
    playerId: move.playerId,
    cardId: move.cardId,
    declaration: move.declaration,
    soundChoice: getCardSound(card),
  });
  broadcastPlayCardOutput(ctx, result);
}

function applyResolveEffect(ctx: ServerContext, move: Extract<AutomaticMove, { type: 'RESOLVE_EFFECT' }>): void {
  const result = ctx.useCases.resolveEffect.execute({ game: ctx.game, playerId: move.playerId, response: move.response });
  broadcastResolveEffectOutput(ctx, result);
}

/** Runs the move's use case and broadcasts its events (throws when the game refuses it). */
function applyMove(ctx: ServerContext, move: AutomaticMove): void {
  if (move.type === 'SELECT_TRUMP') applySelectTrump(ctx, move);
  else if (move.type === 'PLACE_BID') applyPlaceBid(ctx, move);
  else if (move.type === 'RESOLVE_EFFECT') applyResolveEffect(ctx, move);
  else applyPlayCard(ctx, move);
}

/** Publishes the state after a move; a failure here never undoes the move. */
function publish(ctx: ServerContext): void {
  try {
    ctx.broadcastPersonalizedState();
    ctx.saveState();
  } catch (error) {
    console.error('Automatic move state publish error:', error);
  }
}

/**
 * Applies an automatic move and publishes the new state. When the move fails before it reached
 * the game (it is still legal afterwards), `recover` may name a replacement, tried once. True when
 * the game moved on.
 */
export function applyAutomaticMove(
  ctx: ServerContext,
  move: AutomaticMove,
  recover: () => BotTurnOutput = () => ({ type: 'NONE' })
): boolean {
  try {
    applyMove(ctx, move);
  } catch (error) {
    console.error('Automatic move error:', error);
    // A move that is still legal never reached the game: take the replacement (once). A move that
    // is no longer legal was applied before something else failed: publish the new state.
    if (isLegalBotAction(ctx.game, move)) {
      const replacement = recover();
      return replacement.type !== 'NONE' && applyAutomaticMove(ctx, replacement);
    }
  }
  publish(ctx);
  return true;
}

/**
 * The bot's decision. The use case already replaces a failing or illegal brain decision with a
 * legal fallback; this only guards against the use case itself throwing.
 */
function decideBotAction(ctx: ServerContext): BotTurnOutput {
  try {
    return ctx.useCases.botTurn.execute({ game: ctx.game });
  } catch (error) {
    console.error('Bot decision error:', error);
    try {
      return ctx.useCases.botTurn.execute({ game: ctx.game, forceFallback: true });
    } catch (fallbackError) {
      console.error('Bot fallback error:', fallbackError);
      return { type: 'NONE' };
    }
  }
}

/** Whether a bot's decision is waited for (the room schedules turns only then). */
function isBotToAct(ctx: ServerContext): boolean {
  return ctx.useCases.botTurn.getActingBot(ctx.game) !== undefined;
}

/**
 * One bot turn: decide, apply (retrying once with the legal fallback) and publish. Never throws and
 * never schedules anything: the room's scheduler arms the next turn from the resulting state.
 */
export function processBotTurn(ctx: ServerContext): BotTurnOutcome {
  const action = decideBotAction(ctx);
  if (action.type === 'NONE') return isBotToAct(ctx) ? 'failed' : 'idle';
  if (action.fallbackReason) {
    console.warn(`[Bot] ${action.playerId} used the fallback ${action.type}: ${action.fallbackReason}`);
  }

  const moved = ctx.telemetry.withCause({ source: 'bot', actorId: action.playerId, commandType: action.type }, () =>
    applyAutomaticMove(ctx, action, () => ctx.useCases.botTurn.execute({ game: ctx.game, forceFallback: true }))
  );
  return moved ? 'acted' : 'failed';
}
