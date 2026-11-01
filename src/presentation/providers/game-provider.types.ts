/**
 * Game Provider Types
 *
 * `GameContextValue` is the composed view `useGame()` returns: connection, game snapshot, table
 * feed, trick presentation, commands and session actions. Screens that only need one of these use
 * the focused hooks in game-client-context.tsx instead, and re-render only when that part changes.
 */

import type { IGameState, CardPhysicsState, CustomSound, SharedCustomSound } from '@shared/domain';
import type { RoomSettings, EmoteMessage, ChatMessage, BidEvent, TimeoutSoundEvent, LobbyActivityEntry, ConnectionStatus, TrickResult } from '@/presentation/types';
import type { SpecialCardNotice } from '@/presentation/components/special-cards/special-card-notices';
import type { GameCommands } from '../hooks/connection/game-commands';

/** Session-level actions the provider adds on top of the connection (saved session, routing). */
export interface GameSessionActions {
  sessionLoaded: boolean;
  connect: (host: string, room: string, name: string, roomSettings?: RoomSettings) => void;
  disconnect: () => Promise<void>;
  /** Leave the game properly, then open the home page (or, from a tournament table, its tournament). */
  leaveGame: () => Promise<void>;
  clearSession: () => void;
}

export interface GameContextValue extends GameCommands, GameSessionActions {
  // Connection state
  connectionStatus: ConnectionStatus;
  /** The socket is open. */
  isConnected: boolean;
  error: string | null;
  clearError: () => void;
  /** Take the seat back after it was opened in another tab or on another device. */
  takeOverSeat: () => void;
  /** Retry a dropped connection now. */
  retryConnection: () => void;

  // Game state (as the table shows it)
  gameState: IGameState | null;
  playerId: string | null;
  sharedCustomSounds: SharedCustomSound[];
  /** Cards the local player may play now, by the shared domain rule (empty while a play is in flight). */
  legalCardIds: readonly string[];
  /** A card the player played is on its way and not yet confirmed by the server. */
  hasPendingPlay: boolean;

  // Table feed
  emotes: EmoteMessage[];
  chatMessages: ChatMessage[];
  bidEvents: BidEvent[];
  timeoutSoundEvents: TimeoutSoundEvent[];
  /** Announcements of what special cards just did (Bomb, Juggler, Cloud, Witch, Werewolf). */
  specialCardNotices: SpecialCardNotice[];
  /** Lobby activity feed (newest last, a handful of entries). */
  lobbyActivity: LobbyActivityEntry[];

  // Trick presentation
  trickResult: TrickResult | null;
  pendingTrickResult: TrickResult | null;
  isTrickAnimating: boolean;
  /** Played cards still waiting for their flight. */
  trickBacklog: number;
  clearTrickResult: () => void;
  activateTrickResult: () => void;
  getCardSoundChoice: (cardId: string) => string | null;
  getCardCustomAudio: (cardId: string) => CustomSound | null;
  getCardPhysicsState: (cardId: string) => CardPhysicsState | null;
  shouldShowPlayedCard: (cardId: string) => boolean;
  shouldAnimatePlayedCard: (cardId: string) => boolean;
  handlePlayedCardAnimationComplete: (cardId: string) => void;
}
