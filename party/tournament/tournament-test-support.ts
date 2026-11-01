/**
 * Builders and fakes for the tournament match tests (not exported from the barrel).
 */
import { BotDifficulty } from '../../shared/domain/bot-ai/types';
import { matchIdFor, matchRoomCode, type MatchReportOutcome } from '../../shared/domain/tournament';
import { DEFAULT_RULESET_CONFIG, type IRulesetConfig } from '../../shared/domain';
import type { MatchProgressReport, MatchResultReport, MatchTicketClaims, MatchTicketVerification } from '../../shared/tournament';
import type { AlarmChannel } from '../utils/alarm-multiplexer';
import type { MatchTicketVerifier } from './match-ticket-verifier';
import type { MatchResultOutcomeListener, MatchResultSink } from './match-result-outbox';
import type { TournamentMatchServices } from './tournament-match-services';

export const TEST_NOW = 1_800_000_000_000;
export const TEST_TOURNAMENT_ID = 'abcdefghjk23';
export const TEST_MATCH_ID = matchIdFor(TEST_TOURNAMENT_ID, 2, 1);
export const TEST_ROOM = matchRoomCode(TEST_MATCH_ID);
export const TEST_LABEL = 'Spring Cup · Round 2 · Table 1';

/** One round with one card each: a whole match is a handful of commands. */
export const ONE_ROUND_RULESET: IRulesetConfig = {
  ...DEFAULT_RULESET_CONFIG,
  structure: { ...DEFAULT_RULESET_CONFIG.structure, customRoundCount: 1 },
};

export interface RosterEntry {
  uid: string;
  name: string;
  seat: number;
}

export const THREE_MEMBERS: RosterEntry[] = [
  { uid: 'user-a', name: 'Merlin', seat: 1 },
  { uid: 'user-b', name: 'Morgana', seat: 0 },
  { uid: 'user-c', name: 'Nimue', seat: 2 },
];

export function ticketClaims(uid: string, options: {
  roster?: RosterEntry[];
  bots?: number;
  matchId?: string;
  rulesetConfig?: IRulesetConfig;
  exp?: number;
  /** The match deadline the server puts into the descriptor (absent in older tickets). */
  deadlineAt?: number;
} = {}): MatchTicketClaims {
  const roster = options.roster ?? THREE_MEMBERS;
  const matchId = options.matchId ?? TEST_MATCH_ID;
  const [, round, table] = matchId.split('-').map(Number);
  const holder = roster.find((entry) => entry.uid === uid) ?? roster[0];
  return {
    v: 1,
    tid: TEST_TOURNAMENT_ID,
    mid: matchId,
    room: matchRoomCode(matchId),
    uid: holder.uid,
    name: holder.name,
    exp: options.exp ?? TEST_NOW + 60 * 60 * 1000,
    match: {
      round,
      table,
      roster,
      bots: options.bots ?? 0,
      botDifficulty: BotDifficulty.MEDIUM,
      rulesetConfig: options.rulesetConfig ?? ONE_ROUND_RULESET,
      label: TEST_LABEL,
      ...(options.deadlineAt === undefined ? {} : { deadlineAt: options.deadlineAt }),
    },
  };
}

/** Tickets are opaque strings mapped to claims; anything else fails like a forged signature. */
export class FakeTicketVerifier implements MatchTicketVerifier {
  private readonly tickets = new Map<string, MatchTicketClaims>();

  issue(claims: MatchTicketClaims): string {
    const ticket = `ticket:${claims.mid}:${claims.uid}:${this.tickets.size}`;
    this.tickets.set(ticket, claims);
    return ticket;
  }

  verify(ticket: unknown, roomCode: string, now: number): Promise<MatchTicketVerification> {
    const claims = typeof ticket === 'string' ? this.tickets.get(ticket) : undefined;
    if (!claims) return Promise.resolve({ ok: false, reason: 'bad_signature' });
    if (claims.room !== roomCode) return Promise.resolve({ ok: false, reason: 'wrong_room' });
    if (claims.exp <= now) return Promise.resolve({ ok: false, reason: 'expired', claims });
    return Promise.resolve({ ok: true, claims });
  }
}

export class RecordingResultSink implements MatchResultSink {
  readonly reports: MatchResultReport[] = [];
  readonly pings: MatchProgressReport[] = [];
  private listener: MatchResultOutcomeListener | null = null;

  enqueue(report: MatchResultReport): void {
    this.reports.push(structuredClone(report));
  }

  enqueueProgress(ping: MatchProgressReport): void {
    this.pings.push(structuredClone(ping));
  }

  onResultDelivered(listener: MatchResultOutcomeListener): void {
    this.listener = listener;
  }

  /** The server answered the last report (as the outbox would tell the room). */
  answer(outcome: MatchReportOutcome): void {
    const report = this.reports.at(-1);
    if (!report) throw new Error('nothing was reported');
    this.listener?.({ matchId: report.mid, outcome });
  }
}

export class RecordingAlarm implements AlarmChannel {
  at: number | null = null;
  setAlarm(scheduledTime: number): Promise<void> {
    this.at = scheduledTime;
    return Promise.resolve();
  }
  deleteAlarm(): Promise<void> {
    this.at = null;
    return Promise.resolve();
  }
}

export function fakeTournamentServices(): {
  services: TournamentMatchServices;
  tickets: FakeTicketVerifier;
  results: RecordingResultSink;
  alarm: RecordingAlarm;
} {
  const tickets = new FakeTicketVerifier();
  const results = new RecordingResultSink();
  const alarm = new RecordingAlarm();
  return { services: { tickets, results, alarm }, tickets, results, alarm };
}

/** Lets pending promise chains (ticket verification, queued saves) settle. */
export async function settle(rounds = 20): Promise<void> {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
}
