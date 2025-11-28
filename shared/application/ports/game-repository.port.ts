import { Game, IGameState } from '../../domain';

/**
 * Repository interface for game persistence
 * Implements the Repository pattern from Clean Architecture
 */
export interface IGameRepository {
  /**
   * Save game state to storage
   */
  save(game: Game): Promise<void>;

  /**
   * Get game by ID
   */
  get(gameId: string): Game | undefined;

  /**
   * Delete game from storage
   */
  delete(gameId: string): Promise<void>;

  /**
   * Check if game exists
   */
  exists(gameId: string): boolean;

  /**
   * Get all active games
   */
  getAll(): Game[];
}

/**
 * Persisted state structure for storage
 */
export interface PersistedGameState {
  gameState: IGameState | null;
  persistentIdToPlayerId: [string, string][];
  roomSettings: {
    name: string;
    isPublic: boolean;
    maxPlayers: number;
    password?: string;
  };
  botCounter: number;
  hostId: string;
}
