import {
  Game,
  Player,
  GamePhase,
  GameEventType,
  IRoomSettings,
  GameAlreadyStartedError,
  MaxPlayersReachedError,
  PlayerNameTakenError,
  InvalidPlayerNameError,
  InvalidPersistentIdError,
  PlayerKickedError,
  PlayerNameService,
  SessionValidationService,
  type PlayerJoinedEvent,
} from '../../../domain';

export interface JoinGameInput {
  game: Game;
  playerId: string;
  playerName: string;
  persistentId: string;
  roomSettings?: IRoomSettings;
  maxPlayers: number;
  existingPlayerId?: string; // For reconnection - the playerId this persistentId maps to
}

export interface JoinGameOutput {
  playerJoinedEvent: PlayerJoinedEvent;
  isNewPlayer: boolean;
  isHost: boolean;
  playerId: string;
  /** The sanitized name (may differ from input) */
  sanitizedName: string;
  /** Set when the returning player became host (the table had no connected human host). */
  newHostId?: string;
}

/**
 * Use case for joining a game
 * Handles both new players and reconnections with comprehensive validation:
 * - Validates persistentId format
 * - Validates and sanitizes player name
 * - Checks name uniqueness (case-insensitive)
 * - Validates reconnection eligibility for paused games
 * - Rejects players the host removed from this lobby
 */
export class JoinGameUseCase {
  execute(input: JoinGameInput): JoinGameOutput {
    const { game, playerId, playerName, persistentId, existingPlayerId, maxPlayers } = input;

    // 1. Validate persistentId format
    const idValidation = SessionValidationService.validatePersistentId(persistentId);
    if (!idValidation.isValid) {
      throw new InvalidPersistentIdError();
    }

    // 1b. Players the host removed may not come back to this lobby
    if (game.isPlayerKicked(persistentId) || game.isPlayerKicked(playerId)) {
      throw new PlayerKickedError();
    }

    // 2. Validate and sanitize player name
    const nameValidation = PlayerNameService.validate(playerName);
    if (!nameValidation.isValid || !nameValidation.sanitizedName) {
      throw new InvalidPlayerNameError(nameValidation.error ?? 'Invalid player name');
    }
    const sanitizedName = nameValidation.sanitizedName;

    const timestamp = Date.now();

    // 3. Handle reconnection
    if (existingPlayerId) {
      const existingPlayer = game.getPlayer(existingPlayerId);
      if (existingPlayer) {
        // 3a. Validate name uniqueness (allow keeping same name or changing to a unique one)
        if (!game.isNameAvailable(sanitizedName, existingPlayerId)) {
          throw new PlayerNameTakenError(sanitizedName);
        }

        // Takes the seat back, also from a bot that held it while they were away.
        existingPlayer.reclaimByHuman(sanitizedName);
        const newHostId = game.ensureHost() ?? undefined;

        return {
          playerJoinedEvent: {
            type: GameEventType.PLAYER_JOINED,
            playerId: existingPlayerId,
            playerName: sanitizedName,
            timestamp,
          },
          isNewPlayer: false,
          isHost: game.hostId === existingPlayerId,
          playerId: existingPlayerId,
          sanitizedName,
          ...(newHostId ? { newHostId } : {}),
        };
      }
      // If existingPlayerId was provided but player doesn't exist in game,
      // fall through to new player creation (the player may have been removed)
    }

    // 4. New player validation - only allow joining in LOBBY phase
    if (game.phase !== GamePhase.LOBBY) {
      throw new GameAlreadyStartedError();
    }

    // 5. Check player count
    if (game.players.length >= maxPlayers) {
      throw new MaxPlayersReachedError(maxPlayers);
    }

    // 7. Check name uniqueness for new player
    // Note: game.addPlayer() also checks this, but we check here for better error handling
    if (!game.isNameAvailable(sanitizedName)) {
      throw new PlayerNameTakenError(sanitizedName);
    }

    // 8. Create new player
    const player = new Player(playerId, sanitizedName);
    const isFirstPlayer = game.players.length === 0;

    // Set host if first player
    if (isFirstPlayer) {
      game.hostId = playerId;
    }

    // Add player (this also validates name uniqueness as a safety net)
    game.addPlayer(player);

    return {
      playerJoinedEvent: {
        type: GameEventType.PLAYER_JOINED,
        playerId,
        playerName: sanitizedName,
        timestamp,
      },
      isNewPlayer: true,
      isHost: isFirstPlayer,
      playerId,
      sanitizedName,
    };
  }
}
