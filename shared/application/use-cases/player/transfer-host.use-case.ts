import {
  Game,
  GamePhase,
  GameEventType,
  InvalidPhaseError,
  NotHostError,
  PlayerNotFoundError,
  CannotTargetSelfError,
  InvalidHostTargetError,
  type HostChangedEvent,
} from '../../../domain';

export interface TransferHostInput {
  game: Game;
  /** The player handing over the role (must be host) */
  playerId: string;
  /** The new host */
  targetPlayerId: string;
}

export interface TransferHostOutput {
  hostChangedEvent: HostChangedEvent;
}

/**
 * Use case for the host handing the host role to another player.
 * Only host can transfer, only in lobby, and only to a connected human player.
 */
export class TransferHostUseCase {
  execute(input: TransferHostInput): TransferHostOutput {
    const { game, playerId, targetPlayerId } = input;

    // Validate host
    if (game.hostId !== playerId) {
      throw new NotHostError('transfer the host role');
    }

    // Validate phase
    if (game.phase !== GamePhase.LOBBY) {
      throw new InvalidPhaseError('LOBBY', game.phase);
    }

    if (targetPlayerId === playerId) {
      throw new CannotTargetSelfError('transfer the host role to');
    }

    // Validate target
    const target = game.getPlayer(targetPlayerId);
    if (!target) {
      throw new PlayerNotFoundError(targetPlayerId);
    }
    if (target.isBot || !target.isConnected || game.isPlayerGraced(targetPlayerId)) {
      throw new InvalidHostTargetError();
    }

    game.transferHost(targetPlayerId);

    return {
      hostChangedEvent: {
        type: GameEventType.HOST_CHANGED,
        hostId: targetPlayerId,
        timestamp: Date.now(),
      },
    };
  }
}
