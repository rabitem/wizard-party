/**
 * Registry interface for managing player connections and mappings
 */
export interface IPlayerRegistry {
  /**
   * Register a connection for a player
   */
  registerConnection(connectionId: string, playerId: string): void;

  /**
   * Unregister a connection
   */
  unregisterConnection(connectionId: string): void;

  /**
   * Get player ID from connection ID
   */
  getPlayerId(connectionId: string): string | undefined;

  /**
   * Check if player has any active connections
   */
  hasActiveConnection(playerId: string): boolean;

  /**
   * Register persistent ID mapping (for reconnection)
   */
  registerPersistentId(persistentId: string, playerId: string): void;

  /**
   * Get player ID from persistent ID
   */
  getPlayerIdFromPersistentId(persistentId: string): string | undefined;

  /**
   * Get all persistent ID mappings
   */
  getPersistentIdMappings(): Map<string, string>;

  /**
   * Clear all mappings
   */
  clear(): void;
}
