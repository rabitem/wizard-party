/**
 * Presentation Layer Types
 * Barrel export for all presentation-specific type definitions
 */

// Room types
export type { RoomSettings } from './room.types';

// Social types
export type { EmoteMessage, ChatMessage, BidEvent, TimeoutSoundEvent } from './social.types';

// Lobby types
export type { LobbyActivityEntry } from './lobby.types';

// Realtime connection status
export type { ConnectionStatus } from './connection.types';
export { isAwaitingSeat, isTerminalConnectionStatus, isTransientConnectionStatus } from './connection.types';

// Trick presentation
export type { TrickResult } from './trick.types';

// Responsive layout policy and HUD region types
export type {
  LeaderboardPosition,
  LayoutClass,
  LayoutProfile,
  BiddingSurface,
  HudDensity,
  StandingsMode,
  LayoutPolicy,
  HudInsets,
  HudRegion,
  TurnTimerPlacement,
} from './hud-layout.types';
