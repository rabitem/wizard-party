export interface LobbySeatView {
  id: string;
  name: string;
  avatarId: string;
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
   * Plays as a guest: a random avatar and a guest badge. Only the local seat can know this; for
   * other seats a missing account may also be a blocked or hidden one, so they never show it.
   */
  isGuest: boolean;
}

export type LobbyInviteState = 'pending' | 'seen' | 'accepted' | 'declined' | 'expired' | 'revoked';

export interface LobbyInviteView {
  id: string;
  name: string;
  avatarId: string;
  state: LobbyInviteState;
  expiresAt: number;
}

export interface LobbyFriendView {
  userId: string;
  name: string;
  avatarId: string;
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
  avatarId?: string;
}

export type BotDifficulty = 1 | 2 | 3 | 4 | 5;
