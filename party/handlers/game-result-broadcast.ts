import type {
  PlayCardOutput,
  ResolveEffectOutput,
} from "../../shared/application";
import type { TrickCompleteEvent } from "../../shared/domain";
import { TRICK_WIN_SOUNDS, type ServerContext } from "../utils/types";
import { getPlayerTrickWinCustomAudio, getPlayerTrickWinSound, getRandomSound } from "../utils/helpers";

/**
 * Broadcasting of game-flow results, shared by human command handlers and bot
 * actions so both emit the same events in the same order.
 */

function withTrickWinSound(ctx: ServerContext, event: TrickCompleteEvent): TrickCompleteEvent {
  // A Bomb-voided trick is won by nobody: no victory sound.
  if (event.voided) return event;

  const winner = ctx.game.getPlayer(event.winnerId);
  if (winner?.isBot) {
    return { ...event, soundChoice: getRandomSound(TRICK_WIN_SOUNDS) };
  }
  const customTrickWinAudio = getPlayerTrickWinCustomAudio(event.winnerId, ctx.playerSoundPreferences);
  return {
    ...event,
    soundChoice: getPlayerTrickWinSound(event.winnerId, ctx.playerSoundPreferences),
    ...(customTrickWinAudio ? { customTrickWinAudio } : {}),
  };
}

function broadcastRoundEnd(
  ctx: ServerContext,
  output: Pick<PlayCardOutput, 'roundCompleteEvent' | 'gameCompleteEvent'>
): void {
  if (output.roundCompleteEvent) ctx.broadcast(output.roundCompleteEvent);
  if (output.gameCompleteEvent) ctx.broadcast(output.gameCompleteEvent);
}

/**
 * Card played, then (if the trick completed) the trick, resolved special-card
 * effects and the end of round/game.
 */
export function broadcastPlayCardOutput(ctx: ServerContext, output: PlayCardOutput): void {
  ctx.broadcast(output.cardPlayedEvent);
  if (output.trickCompleteEvent) {
    ctx.broadcast(withTrickWinSound(ctx, output.trickCompleteEvent));
  }
  for (const event of output.effectEvents) ctx.broadcast(event);
  broadcastRoundEnd(ctx, output);
}

export function broadcastResolveEffectOutput(ctx: ServerContext, output: ResolveEffectOutput): void {
  for (const event of output.effectEvents) ctx.broadcast(event);
  broadcastRoundEnd(ctx, output);
}
