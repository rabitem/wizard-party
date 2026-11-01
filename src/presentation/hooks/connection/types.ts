import type { ICard, Suit } from '@shared/domain';
import type { SpecialCardNotice } from '@/presentation/components/special-cards/special-card-notices';
import type { BidEvent, ChatMessage, EmoteMessage, LobbyActivityEntry } from '@/presentation/types';

/** A completed trick as the table keeps showing it until its collection. */
export interface PreservedTrick {
  cards: { playerId: string; card: ICard }[];
  leadSuit: Suit | null;
  winnerId: string | null;
}

/** Social state - for components that display social features */
export interface ISocialState {
  emotes: EmoteMessage[];
  chatMessages: ChatMessage[];
  bidEvents: BidEvent[];
}

/**
 * What happens around the table, as short-lived feeds: reactions, chat, bids, special-card notices
 * and the lobby's activity. Kept apart from the game state, which changes with every move.
 */
export interface TableFeed extends ISocialState {
  /** Announcements of what special cards just did (Bomb, Juggler, Cloud, Witch, Werewolf). */
  specialCardNotices: SpecialCardNotice[];
  /** Lobby activity feed (newest last, a handful of entries). */
  lobbyActivity: LobbyActivityEntry[];
}
