'use client';

import { useEffect, useMemo, useState } from 'react';

import { recordGameTrace } from '@/lib/game-trace';
import { clientTelemetry, RealtimeTelemetry, resolveAppVersion } from '@/lib/client-telemetry';

import { getOrCreatePlayerId } from './connection/utils';
import { forgetSeatToken, loadSeatToken, saveSeatToken } from './connection/seat-session-store';
import { createPartyGameSocket, type GameSocketFactory } from './connection/game-socket';
import { ConnectionTelemetry } from './connection/connection-telemetry';
import {
  createConnectionActions,
  createGameClient,
  type ConnectionActions,
  type GameClient,
  type GameClientHandles,
} from './connection/game-client';
import { TableFeeds } from './connection/table-feeds';
import { useSocialState } from './connection/useSocialState';
import { useLobbyActivity } from './connection/useLobbyActivity';
import { useSpecialCardNotices } from './connection/useSpecialCardNotices';
import { useTournamentSeat } from './connection/useTournamentSeat';
import { useSessionWakeups } from './connection/useSessionWakeups';
import type { TableFeed } from './connection/types';

export type { ConnectionActions, GameClientHandles };

export interface UseGameConnectionOptions {
  /** Transport factory; defaults to the realtime worker. The animation sandbox injects a loopback server. */
  socketFactory?: GameSocketFactory;
}

const SEAT_TOKENS = { load: loadSeatToken, save: saveSeatToken, forget: forgetSeatToken };

/** The game client with the browser's adapters: seat tokens, telemetry, traces. */
function createBrowserClient(socketFactory: GameSocketFactory): GameClient {
  return createGameClient({
    socketFactory,
    seatTokens: SEAT_TOKENS,
    telemetry: new ConnectionTelemetry(new RealtimeTelemetry(clientTelemetry), clientTelemetry),
    persistentId: getOrCreatePlayerId,
    appVersion: resolveAppVersion,
    trace: recordGameTrace,
    feeds: new TableFeeds(),
  });
}

/**
 * The game client for one mounted provider (see `createGameClient`), with its feeds (emotes, chat,
 * bids, special-card notices, lobby activity, tournament seat) as React state.
 */
export function useGameConnection({ socketFactory = createPartyGameSocket }: UseGameConnectionOptions = {}) {
  const [client] = useState(() => createBrowserClient(socketFactory));
  const social = useSocialState(client.feeds);
  const lobby = useLobbyActivity(client.feeds);
  const notices = useSpecialCardNotices(client.feeds);
  const tournament = useTournamentSeat(client.feeds);

  useEffect(() => {
    clientTelemetry.setPlayerId(getOrCreatePlayerId() || null);
  }, []);

  useSessionWakeups(client.session);

  const handles = useMemo<GameClientHandles>(() => ({
    store: client.store,
    trick: client.trick,
    commands: client.commands,
    connection: createConnectionActions(client),
  }), [client]);

  const feed = useMemo<TableFeed>(() => ({
    emotes: social.emotes,
    chatMessages: social.chatMessages,
    bidEvents: social.bidEvents,
    specialCardNotices: notices.specialCardNotices,
    lobbyActivity: lobby.lobbyActivity,
  }), [social.emotes, social.chatMessages, social.bidEvents, notices.specialCardNotices, lobby.lobbyActivity]);

  const tournamentTable = useMemo(() => ({
    tournamentMatch: tournament.match,
    tournamentRejection: tournament.rejection,
    dismissTournamentRejection: tournament.dismissRejection,
  }), [tournament.match, tournament.rejection, tournament.dismissRejection]);

  return { handles, feed, tournament: tournamentTable };
}
