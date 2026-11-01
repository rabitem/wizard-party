import type { Game } from '../../shared/domain';
import { TelemetryEventType } from '../../shared/telemetry';
import { telemetryFact, type TelemetryFact } from './telemetry-fact';

/**
 * A rematch request, recorded before the use case decides on it, so refused requests (non-host,
 * wrong phase) are visible too. Only a host's request in GAME_END is followed by `rematch.started`.
 */
export function rematchRequestedFact(
  playerId: string,
  game: Game
): TelemetryFact<typeof TelemetryEventType.REMATCH_REQUESTED> {
  return telemetryFact(TelemetryEventType.REMATCH_REQUESTED, playerId, {
    playerId,
    isHost: game.hostId === playerId,
  });
}
