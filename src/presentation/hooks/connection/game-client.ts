import { characterTicketJoinFields } from '@/lib/account/character-ticket';
import { ExternalStore } from '@/presentation/state/external-store';
import type { RoomSettings } from '@/presentation/types';

import { ErrorNotice } from './error-notice';
import { createGameCommands, type GameCommands } from './game-commands';
import { INITIAL_GAME_CLIENT_STATE, type GameClientState } from './game-client-state';
import type { GameEventContext } from './game-event-router';
import { GameSession } from './game-session';
import type { GameSessionDeps } from './game-session.types';
import { createSessionListener, forgetRoom } from './session-listener';
import type { TableFeeds } from './table-feeds';
import { TrickPresentation } from './trick-presentation';

/** Connection actions; stable for the lifetime of the client. */
export interface ConnectionActions {
  connect(host: string, roomId: string, playerName: string, roomSettings?: RoomSettings): void;
  /** Close and keep the seat for a later rejoin. */
  disconnect(): Promise<void>;
  /** Leave the room for good. */
  leaveGame(): Promise<void>;
  /** Take the seat back after it was opened in another tab or on another device. */
  takeOverSeat(): void;
  /** Retry a dropped connection now instead of waiting out the backoff. */
  retryConnection(): void;
  clearError(): void;
}

/** The long-lived objects of one game client. None of them changes identity. */
export interface GameClientHandles {
  store: ExternalStore<GameClientState>;
  trick: TrickPresentation;
  commands: GameCommands;
  connection: ConnectionActions;
}

export interface GameClientDeps extends GameSessionDeps {
  /** The feeds around the table (social, lobby, special-card notices, tournament seat). */
  feeds: TableFeeds;
}

/** The long-lived parts of one game client. */
export interface GameClient {
  store: ExternalStore<GameClientState>;
  trick: TrickPresentation;
  session: GameSession;
  errors: ErrorNotice;
  commands: GameCommands;
  feeds: TableFeeds;
}

/**
 * The game client's composition root: one GameSession (transport, reconnects, outbox), one store
 * of connection and game state, one TrickPresentation and the table feeds. The session is listened
 * to and routed from the start, so neither a status nor a message that arrives before the UI
 * subscribes is lost. The event router's handlers read everything from these long-lived objects
 * (no closures that go stale).
 */
export function createGameClient({ feeds, ...sessionDeps }: GameClientDeps): GameClient {
  const store = new ExternalStore<GameClientState>(INITIAL_GAME_CLIENT_STATE);
  const trick = new TrickPresentation();
  const session = new GameSession(sessionDeps);
  const errors = new ErrorNotice((error) => store.update((state) => (state.error === error ? state : { ...state, error })));
  const commands = createGameCommands(session, store, trick);
  const context: GameEventContext = {
    store,
    trick,
    session,
    errors,
    social: feeds.social,
    lobby: feeds.lobby,
    notices: feeds.notices,
    tournament: feeds.tournament,
    trace: sessionDeps.trace ?? (() => {}),
  };
  // Every (re)join carries the room's tournament ticket and the player's character ticket.
  const joinFields = (roomId: string) => ({ ...feeds.joinFields(roomId), ...characterTicketJoinFields() });
  session.setListener(createSessionListener({ context, roomChanged: feeds.roomChanged, joinFields }));
  return { store, trick, session, errors, commands, feeds };
}

export function createConnectionActions(client: GameClient): ConnectionActions {
  const { session, errors, feeds } = client;
  return {
    connect: (host, roomId, playerName, roomSettings) => {
      // A deliberate connect: an earlier refusal of a tournament seat is no longer the news.
      feeds.dismissRejection();
      session.connect({ host, roomId, playerName, roomSettings });
    },
    disconnect: async () => {
      session.disconnect();
      forgetRoom(client);
      feeds.roomLeft();
    },
    leaveGame: async () => {
      // The seat token is kept: leaving a running game hands the seat to a bot, and the token is
      // what lets the player take it back. A seat the server removed ignores its old token.
      session.leave();
      forgetRoom(client);
      feeds.roomLeft();
    },
    takeOverSeat: () => session.takeOver(),
    retryConnection: () => session.wake(),
    clearError: () => errors.clear(),
  };
}
