import type { Game } from '../../../domain';
import type { BotTurnOutput } from '../bot/bot-turn.types';
import { fallbackBotAction, isLegalBotAction } from '../bot/bot-fallback';

export interface TurnTimeoutInput {
  game: Game;
}

/**
 * The move the room makes for a connected player whose turn timer ran out (and who still did not
 * act after the heckling window): the same deterministic legal move a failing bot falls back to
 * (most-held suit, lowest allowed bid, first legal card, first acceptable effect answer).
 *
 * A pure decision: the caller applies the move like any other, so it is announced and recorded
 * exactly like the player's own.
 */
export class TurnTimeoutUseCase {
  execute(input: TurnTimeoutInput): BotTurnOutput {
    const { game } = input;
    const timer = game.turnTimerState;
    if (!timer?.expired || game.isPaused()) return { type: 'NONE' };

    const player = game.getPlayer(timer.playerId);
    // Bots act on their own; a timer for anyone else is stale.
    if (!player || player.isBot) return { type: 'NONE' };

    const action = fallbackBotAction(game, player);
    return isLegalBotAction(game, action) ? action : { type: 'NONE' };
  }
}
