import { GameEvent, IGameState } from '../../domain';

/**
 * Event emitter interface for broadcasting game events
 */
export interface IEventEmitter {
  /**
   * Broadcast an event to all connected clients
   */
  broadcast(event: GameEvent): void;

  /**
   * Send an event to a specific connection
   */
  sendToConnection(connectionId: string, event: GameEvent): void;

  /**
   * Send personalized game state to all players
   * (hides opponent hands)
   */
  broadcastPersonalizedState(
    getPersonalizedState: (playerId: string) => IGameState,
    getConnectionsForPlayer: (playerId: string) => string[]
  ): void;

  /**
   * Send error to a specific connection
   */
  sendError(connectionId: string, message: string): void;
}
