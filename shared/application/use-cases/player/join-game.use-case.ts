import {
  Game,
  Player,
  GamePhase,
  GameEventType,
  IRoomSettings,
  GameAlreadyStartedError,
  MaxPlayersReachedError,
  type PlayerJoinedEvent,
} from '../../../domain';

export interface JoinGameInput {
  game: Game;
  playerId: string;
  playerName: string;
  persistentId: string;
  roomSettings?: IRoomSettings;
  maxPlayers: number;
  existingPlayerId?: string; // For reconnection
}

export interface JoinGameOutput {
  playerJoinedEvent: PlayerJoinedEvent;
  isNewPlayer: boolean;
  isHost: boolean;
  playerId: string;
}

/**
 * Use case for joining a game
 * Handles both new players and reconnections
 */
export class JoinGameUseCase {
  execute(input: JoinGameInput): JoinGameOutput {
    const { game, playerId, playerName, existingPlayerId, maxPlayers } = input;

    const timestamp = Date.now();

    // Handle reconnection
    if (existingPlayerId) {
      const existingPlayer = game.getPlayer(existingPlayerId);
      if (existingPlayer) {
        existingPlayer.isConnected = true;
        existingPlayer.name = playerName;

        return {
          playerJoinedEvent: {
            type: GameEventType.PLAYER_JOINED,
            playerId: existingPlayerId,
            playerName,
            timestamp,
          },
          isNewPlayer: false,
          isHost: game.hostId === existingPlayerId,
          playerId: existingPlayerId,
        };
      }
    }

    // New player - validate
    if (game.phase !== GamePhase.LOBBY) {
      throw new GameAlreadyStartedError();
    }

    if (game.players.length >= maxPlayers) {
      throw new MaxPlayersReachedError(maxPlayers);
    }

    // Create new player
    const player = new Player(playerId, playerName);
    const isFirstPlayer = game.players.length === 0;

    // Set host if first player
    if (isFirstPlayer) {
      game.hostId = playerId;
    }

    game.addPlayer(player);

    return {
      playerJoinedEvent: {
        type: GameEventType.PLAYER_JOINED,
        playerId,
        playerName,
        timestamp,
      },
      isNewPlayer: true,
      isHost: isFirstPlayer,
      playerId,
    };
  }
}
