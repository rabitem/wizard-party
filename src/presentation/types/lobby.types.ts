/**
 * Lobby Types
 * Centralized type definitions for the lobby activity feed
 */

/** What happened in the lobby */
export type LobbyActivityKind = 'joined' | 'left' | 'kicked' | 'host' | 'rules' | 'settings';

/**
 * One entry of the lobby activity feed ("Bob joined", "Alice is now host", "Rules changed").
 * `playerName` is the subject: who joined/left/was removed, the new host, or the host who changed
 * the rules or settings.
 */
export interface LobbyActivityEntry {
  id: string;
  kind: LobbyActivityKind;
  playerName?: string;
  /** Client timestamp (ms) */
  at: number;
}
