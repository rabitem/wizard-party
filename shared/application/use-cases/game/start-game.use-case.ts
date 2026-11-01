import { buildTrumpRevealedEvent } from './game-event-factory';
import {
  Game,
  GamePhase,
  GameEventType,
  InvalidPhaseError,
  NotHostError,
  NotEnoughPlayersError,
  PlayersReconnectingError,
  ROOM_PLAYER_LIMITS,
  type GameStartedEvent,
  type TrumpRevealedEvent,
} from '../../../domain';

export interface StartGameInput {
  game: Game;
  playerId: string;
}

export interface StartGameOutput {
  gameStartedEvent: GameStartedEvent;
  trumpRevealedEvent: TrumpRevealedEvent;
}

/**
 * Use case for starting a game
 * Only the host can start, requires 3-6 players
 */
export class StartGameUseCase {
  execute(input: StartGameInput): StartGameOutput {
    const { game, playerId } = input;

    // Validate phase
    if (game.phase !== GamePhase.LOBBY) {
      throw new InvalidPhaseError('LOBBY', game.phase);
    }

    // Validate host
    if (game.hostId !== playerId) {
      throw new NotHostError('start the game');
    }

    // Validate that all lobby humans are still present
    if (game.hasDisconnectedHumanPlayers()) {
      throw new PlayersReconnectingError();
    }

    // Validate player count
    if (!game.canStart()) {
      throw new NotEnoughPlayersError(ROOM_PLAYER_LIMITS.MIN, game.getStartablePlayerCount());
    }

    // Start the game
    game.start();

    const timestamp = Date.now();

    return {
      // Public facts only: each player's hand reaches them in their own projection.
      gameStartedEvent: {
        type: GameEventType.GAME_STARTED,
        playerIds: game.players.map((player) => player.id),
        dealerId: game.getDealer()?.id ?? null,
        maxRounds: game.maxRounds,
        timestamp,
      },
      trumpRevealedEvent: buildTrumpRevealedEvent(game, timestamp),
    };
  }
}
