import {
  TOURNAMENT_TIMING,
  TournamentError,
  assignSeatNames,
  findEntrant,
  matchLabel,
  pendingMatchFor,
  recordMatchProgress,
  recordMatchResult,
  type RecordProgressOutcome,
  type RecordResultOutcome,
  type TournamentStatus,
} from '../../../domain/tournament';
import { parseMatchProgressReport, parseMatchResultReport, toMatchProgress, toMatchReport, type MatchTicketClaims } from '../../../tournament';
import type { ITournamentThrottle, ITournamentTicketSigner } from '../../ports/tournament';
import { requireAllowance } from './tournament-management.use-cases';
import type { TournamentStore } from './tournament-store';

export interface MatchTicketView {
  matchId: string;
  roomCode: string;
  ticket: string;
  expiresAt: number;
  label: string;
}

const FORMER_PLAYER_NAME = 'Former player';

/**
 * Issues the signed ticket that lets the viewer take their seat at their pending table. The
 * descriptor (roster, names, bots, rules) is identical in every roster member's ticket.
 */
export class IssueMatchTicketUseCase {
  constructor(
    private readonly store: TournamentStore,
    private readonly signer: ITournamentTicketSigner,
    private readonly throttle: ITournamentThrottle
  ) {}

  async execute(viewerId: string, tournamentId: unknown): Promise<MatchTicketView> {
    await requireAllowance(this.throttle, 'ticket', viewerId);
    const { tournament, now } = await this.store.read(tournamentId);
    const match = pendingMatchFor(tournament, viewerId);
    if (!match) throw new TournamentError('invalid_state', 'You have no table to play right now.');

    const humans = match.seats.filter((seat): seat is { seat: number; userId: string } => seat.userId !== null);
    const names = assignSeatNames(
      humans.map(({ userId }) => {
        const entrant = findEntrant(tournament, userId);
        return { userId, username: entrant?.username ?? null, displayName: entrant?.displayName ?? FORMER_PLAYER_NAME };
      })
    );
    const nameOf = (userId: string) => names.get(userId) ?? FORMER_PLAYER_NAME;
    const label = matchLabel(tournament, match);
    const expiresAt = Math.min(now + TOURNAMENT_TIMING.TICKET_TTL_MS, match.deadlineAt);
    const claims: MatchTicketClaims = {
      v: 1,
      tid: tournament.id,
      mid: match.id,
      room: match.roomCode,
      uid: viewerId,
      name: nameOf(viewerId),
      exp: expiresAt,
      match: {
        round: match.round,
        table: match.table,
        roster: humans.map(({ userId, seat }) => ({ uid: userId, name: nameOf(userId), seat })),
        bots: match.seats.length - humans.length,
        botDifficulty: tournament.settings.botDifficulty,
        rulesetConfig: tournament.settings.rulesetConfig,
        label,
        deadlineAt: match.deadlineAt,
      },
    };
    return { matchId: match.id, roomCode: match.roomCode, ticket: await this.signer.sign(claims), expiresAt, label };
  }
}

export interface RecordMatchResultOutput {
  outcome: RecordResultOutcome;
  tournamentStatus: TournamentStatus;
}

/**
 * Records a result the game worker reported. The caller (route) has verified the HMAC signature;
 * this validates the body and the roster against the stored table. Idempotent per match, so the
 * worker's at-least-once delivery is safe. Completing a round seats the next one; completing the
 * tournament grants awards, notifies everyone and refreshes their progress (TournamentEffects).
 */
export class RecordMatchResultUseCase {
  constructor(private readonly store: TournamentStore) {}

  async execute(body: unknown): Promise<RecordMatchResultOutput> {
    const parsed = parseMatchResultReport(body);
    if (!parsed) throw new TournamentError('invalid_input', 'Malformed match result.');
    const report = toMatchReport(parsed);
    let outcome: RecordResultOutcome = 'duplicate';
    const { after } = await this.store.mutate(parsed.tid, (tournament, now) => {
      const recorded = recordMatchResult(tournament, report, now);
      outcome = recorded.outcome;
      return recorded.tournament;
    });
    return { outcome, tournamentStatus: after.status };
  }
}

export interface RecordMatchProgressOutput {
  outcome: RecordProgressOutcome;
}

/**
 * Records a progress ping of the game worker (game started, round ended) on its pending table, so
 * the host can't void a table that is being played. The caller (route) has verified the signature.
 * Stale pings and pings for decided tables change nothing ('ignored', no save).
 */
export class RecordMatchProgressUseCase {
  constructor(private readonly store: TournamentStore) {}

  async execute(body: unknown): Promise<RecordMatchProgressOutput> {
    const parsed = parseMatchProgressReport(body);
    if (!parsed) throw new TournamentError('invalid_input', 'Malformed match progress.');
    const progress = toMatchProgress(parsed);
    let outcome: RecordProgressOutcome = 'ignored';
    await this.store.mutate(parsed.tid, (tournament, now) => {
      const recorded = recordMatchProgress(tournament, progress, now);
      outcome = recorded.outcome;
      return recorded.tournament;
    });
    return { outcome };
  }
}
