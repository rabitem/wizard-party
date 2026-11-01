import {
  GameEventType,
  type GamePausedEvent,
} from '../../shared/domain';
import type { ServerContext } from './types';
import { ROOM_TIMING } from '../config/room-timing.config';

type ReconnectRecoveryContext = Pick<ServerContext, 'game' | 'broadcast' | 'telemetry'>;

interface PauseForDisconnectedHumanOptions {
  preferredPlayerId?: string;
  timeoutDuration?: number;
  broadcast?: boolean;
}

function isDisconnectedHuman(player: { isBot: boolean; isConnected: boolean }): boolean {
  return !player.isBot && !player.isConnected;
}

/**
 * Active games can accumulate more than one disconnected human during a restart or while already
 * paused. Keep the room paused until each disconnected human either returns or times out into a
 * bot. The pause deadline is armed by the room from the paused state.
 */
export function pauseForDisconnectedHuman(
  ctx: ReconnectRecoveryContext,
  options: PauseForDisconnectedHumanOptions = {}
): GamePausedEvent | null {
  if (!ctx.game.isActiveGame() || ctx.game.isPaused()) return null;

  const preferredPlayer = options.preferredPlayerId
    ? ctx.game.getPlayer(options.preferredPlayerId)
    : undefined;
  const player =
    preferredPlayer && isDisconnectedHuman(preferredPlayer)
      ? preferredPlayer
      : ctx.game.players.find(isDisconnectedHuman);

  if (!player) return null;

  const timeoutDuration = options.timeoutDuration ?? ROOM_TIMING.RECONNECT_WINDOW_MS;
  ctx.game.pause(player.id, player.name, timeoutDuration);

  const event: GamePausedEvent = {
    type: GameEventType.GAME_PAUSED,
    pausedForPlayerId: player.id,
    pausedForPlayerName: player.name,
    timeoutDuration,
    reason: 'player_disconnected',
    timestamp: Date.now(),
  };

  ctx.telemetry.capture([event], ctx.game);
  if (options.broadcast ?? true) ctx.broadcast(event);
  return event;
}
