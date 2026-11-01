import type { IGameState, IPlayer } from '@shared/domain';
import type { TournamentMatchRoomState } from '@shared/domain/tournament';
import { CONSTANTS } from '@/presentation/config/constants';
import { describeSpecialCardEvent } from '@/presentation/components/special-cards/special-card-notices';
import { ExternalStore } from '@/presentation/state/external-store';

import {
  activityFromEvent,
  activityFromStateChange,
  appendLobbyActivity,
  type LobbyActivityDraft,
  type LobbyActivitySourceEvent,
} from './lobby-activity';
import {
  isTournamentJoinRejectionCode,
  prepareTournamentJoin,
  toTournamentJoinRejection,
  type TicketStorage,
  type TournamentJoinRejection,
} from './tournament-join';
import { clockOffsetOf, readTournamentMatch, sameTournamentMatch } from './tournament-match';
import type { TableFeed } from './types';

/** Reactions, chat and bid bubbles: each entry expires on its own. */
export interface SocialFeedHandlers {
  handleEmote: (playerId: string, playerName: string, emoteId: string, timestamp: number) => void;
  handleChatMessage: (playerId: string, playerName: string, message: string, timestamp: number) => void;
  handleBidPlaced: (playerId: string, bid: number, timestamp: number) => void;
  handleRematchStarted: () => void;
}

/** The lobby's activity feed (joins, leaves, removals, host changes, rule/settings changes). */
export interface LobbyFeedHandlers {
  /** Feed a server event; `state` is the state held before the event is applied. */
  handleLobbyEvent: (event: LobbyActivitySourceEvent, state: IGameState | null, localPlayerId: string | null) => void;
  /** Feed a state transition; detects ruleset and room-settings changes. */
  handleLobbyStateChange: (previous: IGameState | null, next: IGameState) => void;
  resetLobbyActivity: () => void;
}

/** Short-lived announcements of special-card effects (Bomb, Juggler, Cloud, Witch, Werewolf). */
export interface NoticeFeedHandlers {
  /** Turn a server event into a notice if it is about a special card. */
  handleSpecialCardEvent: (
    event: Parameters<typeof describeSpecialCardEvent>[0],
    players: readonly IPlayer[],
    localPlayerId: string | null
  ) => void;
  clearSpecialCardNotices: () => void;
}

/** The tournament match a room is locked to, and the worker's lasting refusal of a seat. */
export interface TournamentSeatHandlers {
  /** Reads the match of a GAME_STATE message; an unchanged match keeps its identity. */
  onGameState: (message: { timestamp?: unknown }, receivedAt: number) => void;
  /**
   * True when an ERROR is the refusal of a tournament seat, which then becomes lasting state; the
   * caller stops reconnecting, since a retry can only be refused again.
   */
  onError: (code: unknown, message: string, roomId: string) => boolean;
  clearMatch: () => void;
}

export interface TableFeedsState extends TableFeed {
  /** The tournament match this room is locked to (sent with every GAME_STATE of a match room). */
  tournamentMatch: TournamentMatchRoomState | null;
  /** The worker refused a seat at a tournament table (lasting, unlike a toast error). */
  tournamentRejection: TournamentJoinRejection | null;
}

export interface TableFeedsOptions {
  /** Where match tickets are read from; the browser's sessionStorage when left out. */
  ticketStorage?: TicketStorage | null;
}

const EMPTY_TABLE_FEEDS: TableFeedsState = {
  emotes: [],
  chatMessages: [],
  bidEvents: [],
  specialCardNotices: [],
  lobbyActivity: [],
  tournamentMatch: null,
  tournamentRejection: null,
};

/**
 * What happens around the table besides the game state, React-free: the social, lobby, notice and
 * tournament slots of the event router write here, the expiry timers trim it, and the UI reads it
 * through `store`. Every handler is a stable function for the lifetime of the client.
 */
export class TableFeeds {
  readonly store = new ExternalStore<TableFeedsState>(EMPTY_TABLE_FEEDS);
  private readonly ticketStorage: TicketStorage | null | undefined;
  private lobbySequence = 0;
  /** Tournament whose ticket went with the last JOIN_GAME (to link back when it is refused). */
  private joinTournamentId: string | null = null;

  constructor({ ticketStorage }: TableFeedsOptions = {}) {
    this.ticketStorage = ticketStorage;
  }

  readonly social: SocialFeedHandlers = {
    handleEmote: (playerId, playerName, emoteId, timestamp) => {
      const emote = { id: `emote-${Date.now()}-${Math.random()}`, playerId, playerName, emoteId, timestamp };
      this.set('emotes', (prev) => [...prev, emote]);
      setTimeout(() => this.set('emotes', (prev) => prev.slice(1)), CONSTANTS.SOCIAL.EMOTE_DISPLAY_MS);
    },
    handleChatMessage: (playerId, playerName, message, timestamp) => {
      const chat = { id: `chat-${Date.now()}-${Math.random()}`, playerId, playerName, message, timestamp };
      this.set('chatMessages', (prev) => [...prev.slice(-(CONSTANTS.SOCIAL.MAX_CHAT_HISTORY - 1)), chat]);
      setTimeout(() => this.set('chatMessages', (prev) => prev.slice(1)), CONSTANTS.SOCIAL.CHAT_DISPLAY_MS);
    },
    handleBidPlaced: (playerId, bid, timestamp) => {
      const bidEvent = { id: `bid-${Date.now()}-${Math.random()}`, playerId, bid, timestamp };
      this.set('bidEvents', (prev) => [...prev, bidEvent]);
      setTimeout(() => this.set('bidEvents', (prev) => prev.slice(1)), CONSTANTS.SOCIAL.BID_DISPLAY_MS);
    },
    handleRematchStarted: () => {
      this.store.update((state) => ({ ...state, emotes: [], chatMessages: [], bidEvents: [] }));
    },
  };

  readonly lobby: LobbyFeedHandlers = {
    handleLobbyEvent: (event, state, localPlayerId) => {
      const draft = activityFromEvent(event, state, localPlayerId, Date.now());
      if (draft) this.appendLobbyActivity([draft]);
    },
    handleLobbyStateChange: (previous, next) => {
      this.appendLobbyActivity(activityFromStateChange(previous, next, Date.now()));
    },
    resetLobbyActivity: () => this.set('lobbyActivity', () => []),
  };

  readonly notices: NoticeFeedHandlers = {
    handleSpecialCardEvent: (event, players, localPlayerId) => {
      const notice = describeSpecialCardEvent(event, players, localPlayerId);
      if (!notice) return;
      this.set('specialCardNotices', (prev) => [...prev.slice(-(CONSTANTS.SPECIAL_CARDS.MAX_NOTICES - 1)), notice]);
      setTimeout(
        () => this.set('specialCardNotices', (prev) => prev.filter((shown) => shown.id !== notice.id)),
        CONSTANTS.SPECIAL_CARDS.NOTICE_DISPLAY_MS
      );
    },
    clearSpecialCardNotices: () => this.set('specialCardNotices', () => []),
  };

  readonly tournament: TournamentSeatHandlers = {
    onGameState: (message, receivedAt) => {
      const next = readTournamentMatch(message, clockOffsetOf(message.timestamp, receivedAt));
      this.set('tournamentMatch', (previous) => (sameTournamentMatch(previous, next) ? previous : next));
    },
    onError: (code, message, roomId) => {
      if (!isTournamentJoinRejectionCode(code)) return false;
      const rejection = toTournamentJoinRejection(code, message, roomId, this.joinTournamentId, this.ticketStorage);
      this.set('tournamentRejection', () => rejection);
      return true;
    },
    clearMatch: () => this.set('tournamentMatch', () => null),
  };

  /** Fields to spread into JOIN_GAME for this room: its stored ticket. */
  joinFields = (roomId: string): Record<string, unknown> => {
    const join = prepareTournamentJoin(roomId, this.ticketStorage);
    this.joinTournamentId = join.tournamentId;
    return join.fields;
  };

  /** Forget a refused seat (the lobby page leaves; a new visit may bring a fresh ticket). */
  dismissRejection = (): void => this.set('tournamentRejection', () => null);

  /** Another room is being joined: the previous room's lobby activity is not news there. */
  roomChanged = (): void => this.lobby.resetLobbyActivity();

  /** The room was left or disconnected on purpose. */
  roomLeft = (): void => {
    this.store.update((state) => ({ ...state, lobbyActivity: [], tournamentMatch: null }));
  };

  private appendLobbyActivity(drafts: LobbyActivityDraft[]): void {
    if (drafts.length === 0) return;
    const entries = drafts.map((draft) => {
      this.lobbySequence += 1;
      return { ...draft, id: `lobby-${draft.kind}-${draft.at}-${this.lobbySequence}` };
    });
    this.set('lobbyActivity', (prev) => appendLobbyActivity(prev, entries, CONSTANTS.LOBBY.ACTIVITY_MAX_ENTRIES));
  }

  /** Replaces one feed; an unchanged feed (same identity) notifies nobody. */
  private set<K extends keyof TableFeedsState>(key: K, next: (current: TableFeedsState[K]) => TableFeedsState[K]): void {
    this.store.update((state) => {
      const value = next(state[key]);
      return Object.is(value, state[key]) ? state : { ...state, [key]: value };
    });
  }
}
