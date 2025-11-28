import {
  Game,
  GamePhase,
  GameEventType,
  type PlayerLeftEvent,
} from '../../../domain';

export interface LeaveGameInput {
  game: Game;
  playerId: string;
}

export interface LeaveGameOutput {
  playerLeftEvent: PlayerLeftEvent;
  wasRemoved: boolean;
}

/**
 * Use case for leaving a game
 * In lobby, player is removed. In game, player is marked disconnected.
 */
export class LeaveGameUseCase {
  execute(input: LeaveGameInput): LeaveGameOutput {
    const { game, playerId } = input;

    const player = game.getPlayer(playerId);
    if (!player) {
      return {
        playerLeftEvent: {
          type: GameEventType.PLAYER_LEFT,
          playerId,
          timestamp: Date.now(),
        },
        wasRemoved: false,
      };
    }

    let wasRemoved = false;

    if (game.phase === GamePhase.LOBBY) {
      // In lobby, remove player completely
      game.removePlayer(playerId);
      wasRemoved = true;
    } else {
      // In game, mark as disconnected
      player.isConnected = false;
    }

    return {
      playerLeftEvent: {
        type: GameEventType.PLAYER_LEFT,
        playerId,
        timestamp: Date.now(),
      },
      wasRemoved,
    };
  }
}
