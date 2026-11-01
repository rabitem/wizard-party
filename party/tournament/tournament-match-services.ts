import type { OutboxStorage } from '../telemetry';
import type { AlarmChannel } from '../utils/alarm-multiplexer';
import { HttpMatchResultTransport } from './http-match-result-transport';
import { MatchResultOutbox, type MatchResultSink } from './match-result-outbox';
import { HmacMatchTicketVerifier, type MatchTicketVerifier } from './match-ticket-verifier';

/** What the game server needs for tournament match rooms (injected by the hosting adapter). */
export interface TournamentMatchServices {
  /** Null without TOURNAMENT_SECRET: no ticket can be verified, so tournaments are unavailable. */
  tickets: MatchTicketVerifier | null;
  results: MatchResultSink;
  /** The match controller's own alarm channel (start countdown, no-show deadline, round advance). */
  alarm: AlarmChannel;
}

const NOOP_ALARM: AlarmChannel = {
  setAlarm: () => Promise.resolve(),
  deleteAlarm: () => Promise.resolve(),
};

/** Default when the host provides nothing (tests, a worker without the secret). */
export const TOURNAMENTS_UNAVAILABLE: TournamentMatchServices = {
  tickets: null,
  results: { enqueue: () => undefined, enqueueProgress: () => undefined, onResultDelivered: () => undefined },
  alarm: NOOP_ALARM,
};

export interface TournamentWorkerConfig {
  /** TOURNAMENT_SECRET; unset or empty disables tournaments on this worker. */
  secret?: string;
  /** TOURNAMENT_RESULT_URL (the app's /api/tournaments/match-results); unset disables tournaments. */
  resultUrl?: string;
  storage: OutboxStorage;
  /** Alarm channel of the match controller. */
  matchAlarm: AlarmChannel;
  /** Alarm channel of the result outbox. */
  resultsAlarm: AlarmChannel;
  fetch?: typeof fetch;
}

export interface TournamentWorkerServices {
  services: TournamentMatchServices;
  /** Null when tournaments are unavailable; the adapter resumes and flushes it on its alarm. */
  outbox: MatchResultOutbox | null;
}

/** Composition root of the worker's tournament support. */
export function createTournamentMatchServices(config: TournamentWorkerConfig): TournamentWorkerServices {
  // Trimmed exactly like the server's tournamentSecret(), so a pasted value with a trailing newline
  // signs and verifies the same bytes on both sides; blank counts as unset.
  const secret = config.secret?.trim();
  const resultUrl = config.resultUrl?.trim();
  if (!secret || !resultUrl) return { services: { ...TOURNAMENTS_UNAVAILABLE, alarm: config.matchAlarm }, outbox: null };

  const outbox = new MatchResultOutbox({
    storage: config.storage,
    transport: new HttpMatchResultTransport({
      url: resultUrl,
      secret,
      fetch: config.fetch,
    }),
    alarm: config.resultsAlarm,
  });
  return {
    services: { tickets: new HmacMatchTicketVerifier(secret), results: outbox, alarm: config.matchAlarm },
    outbox,
  };
}
