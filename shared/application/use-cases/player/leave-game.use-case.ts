import {
  Game,
  GamePhase,
  GameEventType,
  type PlayerLeftEvent,
  type GamePausedEvent,
} from '../../../domain';

export interface LeaveGameInput {
  game: Game;
  playerId: string;
  isIntentional?: boolean; // true if player clicked leave, false if disconnected
  pauseTimeoutDuration?: number; // milliseconds, default 120000 (2 minutes)
}

export interface LeaveGameOutput {
  playerLeftEvent: PlayerLeftEvent;
  gamePausedEvent?: GamePausedEvent;
  wasRemoved: boolean;
  shouldPause: boolean;
  newHostId?: string; // if host left and was transferred
}

const DEFAULT_PAUSE_TIMEOUT = 120000; // 2 minutes

/**
 * Use case for leaving a game
 * - In lobby: player is removed completely
 * - In active game: game is paused, waiting for reconnect or timeout
 * - In GAME_END: player is just marked disconnected
 */
export class LeaveGameUseCase {
  execute(input: LeaveGameInput): LeaveGameOutput {
    const {
      game,
      playerId,
      isIntentional = false,
      pauseTimeoutDuration = DEFAULT_PAUSE_TIMEOUT,
    } = input;

    const player = game.getPlayer(playerId);
    if (!player) {
      return {
        playerLeftEvent: {
          type: GameEventType.PLAYER_LEFT,
          playerId,
          timestamp: Date.now(),
        },
        wasRemoved: false,
        shouldPause: false,
      };
    }

    const playerName = player.name;
    let wasRemoved = false;
    let shouldPause = false;
    let gamePausedEvent: GamePausedEvent | undefined;
    let newHostId: string | undefined;

    // Mark player as disconnected
    player.isConnected = false;

    if (game.phase === GamePhase.LOBBY) {
      // In lobby, remove player completely
      game.removePlayer(playerId);
      wasRemoved = true;

      // Transfer host if needed
      if (game.hostId === playerId && game.players.length > 0) {
        const newHost = game.players.find(p => !p.isBot) || game.players[0];
        game.transferHost(newHost.id);
        newHostId = newHost.id;
      }
    } else if (game.phase === GamePhase.GAME_END) {
      // Game already ended, just mark disconnected (already done above)
    } else if (game.phase === GamePhase.PAUSED) {
      // Already paused - another player leaving during pause
      // Just mark them disconnected, don't change pause state
    } else if (game.isActiveGame()) {
      // Active game - pause for reconnection
      shouldPause = true;
      game.pause(playerId, playerName, pauseTimeoutDuration);

      gamePausedEvent = {
        type: GameEventType.GAME_PAUSED,
        pausedForPlayerId: playerId,
        pausedForPlayerName: playerName,
        timeoutDuration: pauseTimeoutDuration,
        reason: isIntentional ? 'player_left' : 'player_disconnected',
        timestamp: Date.now(),
      };

      // Transfer host if needed (but keep player in game for potential reconnect)
      if (game.hostId === playerId) {
        const connectedPlayers = game.players.filter(p => p.isConnected && !p.isBot);
        if (connectedPlayers.length > 0) {
          game.transferHost(connectedPlayers[0].id);
          newHostId = connectedPlayers[0].id;
        }
      }
    }

    return {
      playerLeftEvent: {
        type: GameEventType.PLAYER_LEFT,
        playerId,
        timestamp: Date.now(),
      },
      gamePausedEvent,
      wasRemoved,
      shouldPause,
      newHostId,
    };
  }
}
