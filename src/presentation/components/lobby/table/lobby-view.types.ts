import type { CharacterAppearance } from '@shared/domain/character';

export interface LobbySeatView {
  id: string;
  name: string;
  /** null: a silhouette (a guest, or a player whose account is unknown). */
  appearance: CharacterAppearance | null;
  level?: number;
  isHost: boolean;
  isLocal: boolean;
  isBot: boolean;
  botLabel?: string;
  isReady: boolean;
  isConnected: boolean;
  /** Epoch ms when a disconnected player's seat is released, null when unknown. */
  graceEndsAt: number | null;
  /** Signed-in player behind the seat (enables friend actions). */
  hasAccount: boolean;
  /**
   * Plays as a guest: a silhouette and a guest badge. Only the local seat can know this; for
   * other seats a missing account may also be a blocked or hidden one, so they never show it.
   */
  isGuest: boolean;
}

export type LobbyInviteState = 'pending' | 'seen' | 'accepted' | 'declined' | 'expired' | 'revoked';

export interface LobbyInviteView {
  id: string;
  name: string;
  appearance: CharacterAppearance;
  state: LobbyInviteState;
  expiresAt: number;
}

export interface LobbyFriendView {
  userId: string;
  name: string;
  appearance: CharacterAppearance;
  level: number;
  presence: 'online' | 'away' | 'busy' | 'offline';
  /** "In a game" detail line, when known. */
  activity: 'menu' | 'lobby' | 'game' | null;
  /** Live invite to this room, if any. */
  inviteId: string | null;
  inviteState: LobbyInviteState | null;
  isSeated: boolean;
}

export interface RuleChip {
  id: string;
  label: string;
  isHouseRule: boolean;
  icon?: 'timer';
}

export interface StartReadiness {
  canStart: boolean;
  reason: string;
}

export type LobbyActivityKind = 'joined' | 'left' | 'kicked' | 'host' | 'rules' | 'settings' | 'invite-accepted';

export interface LobbyActivityView {
  id: string;
  kind: LobbyActivityKind;
  text: string;
  /** Shown instead of the kind's icon when the activity is about a known player. */
  appearance?: CharacterAppearance;
}

export type BotDifficulty = 1 | 2 | 3 | 4 | 5;
