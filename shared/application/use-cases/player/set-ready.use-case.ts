import {
  Game,
  GamePhase,
  InvalidPhaseError,
  PlayerNotFoundError,
} from '../../../domain';

export interface SetReadyInput {
  game: Game;
  playerId: string;
  ready: boolean;
}

export interface SetReadyOutput {
  playerId: string;
  isReady: boolean;
  /** False when the flag already had the requested value */
  changed: boolean;
}

/**
 * Use case for a player toggling their own lobby ready flag.
 * Any human player may do this, only in the lobby. Bots are always ready.
 */
export class SetReadyUseCase {
  execute(input: SetReadyInput): SetReadyOutput {
    const { game, playerId, ready } = input;

    // Validate phase
    if (game.phase !== GamePhase.LOBBY) {
      throw new InvalidPhaseError('LOBBY', game.phase);
    }

    // Validate player (bots have no ready toggle)
    const player = game.getPlayer(playerId);
    if (!player || player.isBot) {
      throw new PlayerNotFoundError(playerId);
    }

    const changed = player.isReady !== ready;
    player.isReady = ready;

    return { playerId, isReady: player.isReady, changed };
  }
}
