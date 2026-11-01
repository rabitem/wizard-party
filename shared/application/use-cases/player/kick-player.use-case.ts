import {
  Game,
  GamePhase,
  GameEventType,
  InvalidPhaseError,
  NotHostError,
  PlayerNotFoundError,
  CannotTargetSelfError,
  type PlayerKickedEvent,
} from '../../../domain';

export interface KickPlayerInput {
  game: Game;
  /** The player issuing the kick (must be host) */
  playerId: string;
  /** The player to remove */
  targetPlayerId: string;
  /** Identities the removed player could rejoin with besides the seat id (their browser ids). */
  rejoinIdentities?: readonly string[];
}

export interface KickPlayerOutput {
  playerKickedEvent: PlayerKickedEvent;
}

/**
 * Use case for the host removing a player from the lobby.
 * Only host can kick, only in lobby, never themselves. The removed player is
 * blocked from rejoining this lobby (see JoinGameUseCase).
 */
export class KickPlayerUseCase {
  execute(input: KickPlayerInput): KickPlayerOutput {
    const { game, playerId, targetPlayerId, rejoinIdentities = [] } = input;

    // Validate host
    if (game.hostId !== playerId) {
      throw new NotHostError('remove players');
    }

    // Validate phase
    if (game.phase !== GamePhase.LOBBY) {
      throw new InvalidPhaseError('LOBBY', game.phase);
    }

    if (targetPlayerId === playerId) {
      throw new CannotTargetSelfError('remove');
    }

    // Validate target exists
    const target = game.getPlayer(targetPlayerId);
    if (!target) {
      throw new PlayerNotFoundError(targetPlayerId);
    }

    game.kickPlayer(targetPlayerId, rejoinIdentities);

    return {
      playerKickedEvent: {
        type: GameEventType.PLAYER_KICKED,
        playerId: targetPlayerId,
        playerName: target.name,
        timestamp: Date.now(),
      },
    };
  }
}
