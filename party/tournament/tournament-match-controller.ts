import type * as Party from '../runtime';
import {
  GameError,
  GamePhase,
  TournamentNoShowError,
  TournamentTicketInvalidError,
  TournamentTicketRequiredError,
  TournamentsUnavailableError,
  ensureRoomSettings,
  type JoinGameCommand,
} from '../../shared/domain';
import { TOURNAMENT_TIMING, isTournamentRoomCode, type TournamentMatchRoomState } from '../../shared/domain/tournament';
import { isSameMatch, type MatchTicketClaims } from '../../shared/tournament';
import { handleJoinGame, type JoinOptions } from '../handlers/join-handlers';
import { roomSettingsChangedFact, rulesetChangedFact } from '../telemetry';
import type { ServerContext } from '../utils/types';
import { lockedCommandError } from './match-command-gate';
import {
  bindSeat,
  isPastDeadline,
  lockMatchRecord,
  matchDeadline,
  matchTableSize,
  parseMatchRecord,
  seatOfPlayer,
  seatOfUser,
  type MatchSeatRecord,
  type TournamentMatchRecord,
} from './match-record';
import { buildForfeitReport, buildMatchProgressReport, buildMatchResultReport } from './match-result-builder';
import type { DeliveredMatchResult } from './match-result-outbox';
import { tournamentRoomInfo, toMatchRoomState, type TournamentRoomInfo } from './match-room-view';
import { TOURNAMENT_MATCH_STORAGE_KEY, TOURNAMENT_ROOM_TIMING } from './match-room.constants';
import { matchDeadlines, nextMatchDeadline, reconcileMatchRecord } from './match-schedule';
import { hasSeatedMembers, seatTableForStart } from './match-start';
import type { TournamentMatchServices } from './tournament-match-services';

/** Outcome of the asynchronous part of a join (ticket verification). */
export type JoinAdmission =
  /**
   * An authentic ticket for this room. `reconnectOnly` when it expired: it still proves the
   * account, but only lets it take back a seat it already holds (expiry mid-game, clock skew).
   */
  | { ok: true; claims: MatchTicketClaims; reconnectOnly: boolean }
  | { ok: false; error: GameError };

type RoomInfoBase = Omit<TournamentRoomInfo, 'isAvailable' | 'tournament'>;

/**
 * What a match join takes from JOIN_GAME besides the ticket: the client's protocol and its seat
 * token. Room settings are never taken from a client: the match fixes them.
 */
export type MatchJoinOptions = Pick<JoinOptions, 'sessionToken' | 'protocolVersion'>;

/** The roster seat a ticket opens, and the game seat the account already holds (if any). */
interface TicketSeat {
  seat: MatchSeatRecord;
  heldPlayerId: string | undefined;
}

/** A round is being played (a heartbeat ping proves it); round ends ping on their own. */
const ROUND_IN_PLAY_PHASES: ReadonlySet<GamePhase> = new Set([GamePhase.TRUMP_SELECTION, GamePhase.BIDDING, GamePhase.PLAYING]);

function log(entry: Record<string, unknown>): void {
  console.log(JSON.stringify(entry));
}

/**
 * Tournament match mode of one room (docs/accounts/tournaments.md, "Game worker: match mode").
 *
 * Rooms with a tournament code only seat holders of a valid ticket. The first ticket locks the
 * room to its match (persisted), seats are bound to accounts, the host-style commands are refused,
 * the match starts by itself (full roster + countdown, or the no-show deadline; never after the
 * match deadline), progress pings (start, round ends, heartbeats in long rounds) and the attested
 * result go to a durable outbox, and the server's answer to the result is shown at the table.
 * Everything else is the regular game.
 *
 * The controller reads and changes the game through the server context; the server calls `sync`
 * after every state change, so the lock always follows the game.
 */
export class TournamentMatchController {
  private record: TournamentMatchRecord | null = null;
  private armedAt: number | null = null;
  /** After a failed start or advance, no deadline fires before this time. */
  private retryNotBefore: number | null = null;
  /** When this instance last pinged (or first saw the game after a restart); paces the heartbeat. */
  private lastProgressAt: number | null = null;

  constructor(
    private readonly roomId: string,
    private readonly services: TournamentMatchServices,
    private readonly context: () => ServerContext
  ) {
    services.results.onResultDelivered((delivered) => this.onResultDelivered(delivered));
  }

  /** The room code is in the tournament namespace (match rooms never take casual players). */
  get isMatchRoom(): boolean {
    return isTournamentRoomCode(this.roomId);
  }

  /** Restores the lock, re-arms its deadlines and reports a result a crash left behind. */
  async load(): Promise<void> {
    if (!this.isMatchRoom) return;
    const stored = await this.context().room.storage.get<unknown>(TOURNAMENT_MATCH_STORAGE_KEY);
    this.record = parseMatchRecord(stored);
    if (stored !== undefined && stored !== null && !this.record) {
      log({ level: 'error', msg: 'tournament_match_record_unreadable', roomId: this.roomId });
    }
    this.sync();
  }

  /** Joins this controller decides: everything in a tournament room, and any ticketed join. */
  handlesJoin(command: JoinGameCommand): boolean {
    return this.isMatchRoom || command.tournamentTicket !== undefined;
  }

  /**
   * Verifies the ticket (asynchronous, so it runs before the join itself). Never throws.
   *
   * Every (re)join needs an authentic ticket: player ids are visible to the whole table, so a
   * persistent id alone must never be enough to take a seat.
   */
  async admit(command: JoinGameCommand): Promise<JoinAdmission> {
    const { tickets } = this.services;
    if (!tickets) return { ok: false, error: new TournamentsUnavailableError() };
    if (command.tournamentTicket === undefined) return { ok: false, error: new TournamentTicketRequiredError() };
    let rejection: string;
    try {
      const verification = await tickets.verify(command.tournamentTicket, this.roomId, Date.now());
      if (verification.ok) return { ok: true, claims: verification.claims, reconnectOnly: false };
      if (verification.reason === 'expired') return { ok: true, claims: verification.claims, reconnectOnly: true };
      rejection = verification.reason;
    } catch (error) {
      log({ level: 'error', msg: 'tournament_ticket_verification_failed', roomId: this.roomId, error: String(error) });
      rejection = 'malformed';
    }
    return { ok: false, error: new TournamentTicketInvalidError(rejection) };
  }

  /**
   * Seats an admitted player under their seat's name; true when they hold the seat now. The ticket
   * is the credential: it attests the account's seat, so a member takes it back from any device
   * (with or without that device's session token).
   */
  join(admission: JoinAdmission, persistentId: string, sender: Party.Connection, options: MatchJoinOptions = {}): boolean {
    try {
      if (!admission.ok) throw admission.error;
      const { seat, heldPlayerId } = this.seatForTicket(admission.claims, persistentId, admission.reconnectOnly);

      const ctx = this.context();
      handleJoinGame(ctx, seat.name, persistentId, sender, {
        sessionToken: options.sessionToken,
        protocolVersion: options.protocolVersion,
        attestedPlayerId: heldPlayerId,
      });
      const playerId = ctx.connectionToPlayer.get(sender.id);
      if (!playerId || ctx.persistentIdToPlayerId.get(persistentId) !== playerId || !ctx.game.getPlayer(playerId)) return false;

      this.setRecord(bindSeat(this.requireRecord(), seat.uid, playerId, Date.now()));
      ctx.broadcastPersonalizedState();
      return true;
    } catch (error) {
      if (!(error instanceof GameError)) throw error;
      this.context().sendError(sender, error.message, error.code, error);
      return false;
    }
  }

  /** The error for a command match rooms refuse, or null. */
  lockedCommandError(commandType: string): GameError | null {
    return this.isMatchRoom ? lockedCommandError(commandType) : null;
  }

  /** Sent to the table with every game state; null outside match rooms. */
  roomState(): TournamentMatchRoomState | null {
    return this.record ? toMatchRoomState(this.record, this.context().game) : null;
  }

  /** Public room info of a tournament room, or null for casual rooms (unchanged answer). */
  roomInfo(base: RoomInfoBase): TournamentRoomInfo | null {
    return this.isMatchRoom ? tournamentRoomInfo(base, this.record) : null;
  }

  /**
   * Follows the game after any change: countdown, takeovers, round ends (with a progress ping),
   * a heartbeat ping while a long round is played; hands the result to the outbox once the game is over; persists the lock and arms the earliest
   * deadline.
   */
  sync(): void {
    if (!this.record) return;
    const ctx = this.context();
    const now = Date.now();
    const previous = this.record;
    let next = reconcileMatchRecord(previous, ctx.game, now);
    if (ctx.game.phase === GamePhase.GAME_END && next.reportedAt === null) {
      next = { ...next, reportedAt: now };
      // Same turn as the record write: both land in storage together.
      this.services.results.enqueue(buildMatchResultReport(next, ctx.game, now));
      log({ level: 'info', msg: 'tournament_match_reported', roomId: this.roomId, matchId: next.mid });
    } else if (next.roundEnd !== null && next.roundEnd.round !== previous.roundEnd?.round) {
      // Round r is over: the table plays round r + 1 next.
      this.reportProgress(next, next.roundEnd.round + 1, now);
    } else if (ROUND_IN_PLAY_PHASES.has(ctx.game.phase) && this.isHeartbeatDue(now)) {
      this.reportProgress(next, ctx.game.currentRound, now);
    }
    this.setRecord(next);
    this.arm(next);
  }

  /** The controller's alarm channel fired: start the match or advance a finished round. */
  onAlarm(): void {
    this.armedAt = null;
    this.sync();
    if (!this.record) return;
    const deadlines = matchDeadlines(this.record, this.context().game);
    const now = Date.now();
    try {
      if (deadlines.start !== null && deadlines.start <= now) this.startMatch();
      else if (deadlines.roundAdvance !== null && deadlines.roundAdvance <= now) this.advanceRound();
      this.retryNotBefore = null;
    } catch (error) {
      this.retryNotBefore = now + TOURNAMENT_ROOM_TIMING.FAILED_ALARM_RETRY_MS;
      log({ level: 'error', msg: 'tournament_match_alarm_failed', roomId: this.roomId, matchId: this.record.mid, error: String(error) });
    }
    this.sync();
  }

  /** The server answered the delivered result: keep it with the lock and show it at the table. */
  private onResultDelivered({ matchId, outcome }: DeliveredMatchResult): void {
    const record = this.record;
    if (!record || record.mid !== matchId || record.reportOutcome === outcome) return;
    this.setRecord({ ...record, reportOutcome: outcome });
    if (outcome === 'superseded') log({ level: 'warn', msg: 'tournament_match_result_superseded', roomId: this.roomId, matchId });
    this.context().broadcastPersonalizedState();
  }

  /** Proof of life for the tournament; never once the result is out or after the match deadline. */
  private reportProgress(record: TournamentMatchRecord, round: number, now: number): void {
    if (record.startedAt === null || record.reportedAt !== null || isPastDeadline(record, now)) return;
    const progress = buildMatchProgressReport(record, { round, maxRounds: this.context().game.maxRounds }, now);
    this.services.results.enqueueProgress(progress);
    this.lastProgressAt = now;
  }

  /**
   * The table played on for MATCH_PROGRESS_HEARTBEAT_MS since the last ping. Paced from the first
   * change this instance saw, so a room merely restored after a restart claims no activity.
   */
  private isHeartbeatDue(now: number): boolean {
    this.lastProgressAt ??= now;
    return now - this.lastProgressAt >= TOURNAMENT_TIMING.MATCH_PROGRESS_HEARTBEAT_MS;
  }

  private requireRecord(): TournamentMatchRecord {
    if (!this.record) throw new TournamentTicketRequiredError();
    return this.record;
  }

  private setRecord(next: TournamentMatchRecord): void {
    if (next === this.record) return;
    this.record = next;
    // Unawaited on purpose: writes of one turn (record + outbox report) land in storage together.
    this.context().room.storage.put(TOURNAMENT_MATCH_STORAGE_KEY, next).catch((error: unknown) => {
      log({ level: 'error', msg: 'tournament_match_record_save_failed', roomId: this.roomId, error: String(error) });
    });
  }

  private arm(record: TournamentMatchRecord): void {
    const deadline = nextMatchDeadline(matchDeadlines(record, this.context().game));
    const at = deadline === null || this.retryNotBefore === null ? deadline : Math.max(deadline, this.retryNotBefore);
    if (at === this.armedAt) return;
    this.armedAt = at;
    const { alarm } = this.services;
    (at === null ? alarm.deleteAlarm() : alarm.setAlarm(at)).catch((error: unknown) => {
      log({ level: 'error', msg: 'tournament_match_alarm_arm_failed', roomId: this.roomId, error: String(error) });
    });
  }

  /**
   * Locks the room on the first ticket, then finds the holder's roster seat and the game seat the
   * account holds already (attested to the join). An expired ticket (`reconnectOnly`) neither
   * locks the room nor seats anybody new.
   */
  private seatForTicket(claims: MatchTicketClaims, persistentId: string, reconnectOnly: boolean): TicketSeat {
    if (!this.record && reconnectOnly) throw new TournamentTicketInvalidError('expired');
    if (!this.record) this.lock(claims);
    const record = this.requireRecord();
    if (!isSameMatch(record, claims)) throw new TournamentTicketInvalidError('other_match');

    const seat = seatOfUser(record, claims.uid);
    if (!seat) throw new TournamentTicketInvalidError('not_on_roster');
    // The match went on without them: the lasting refusal sends them back to the tournament page.
    if (seat.noShow) throw new TournamentNoShowError();

    const ctx = this.context();
    const held = seat.playerId !== null && ctx.game.getPlayer(seat.playerId) !== undefined;
    if (reconnectOnly && !held) throw new TournamentTicketInvalidError('expired');
    const mappedPlayerId = ctx.persistentIdToPlayerId.get(persistentId);
    const mappedSeat = mappedPlayerId === undefined ? undefined : seatOfPlayer(record, mappedPlayerId);
    // One browser, two accounts at the same table: never hand one member's seat to the other.
    if (mappedSeat && mappedSeat.uid !== seat.uid) throw new TournamentTicketInvalidError('seat_mismatch');
    // The member's seat is taken over from wherever it was (other device, other browser).
    return { seat, heldPlayerId: held && seat.playerId !== null ? seat.playerId : undefined };
  }

  private lock(claims: MatchTicketClaims): void {
    const ctx = this.context();
    if (ctx.game.phase !== GamePhase.LOBBY || ctx.game.players.length > 0) throw new TournamentTicketInvalidError('room_in_use');

    this.applyMatchRules(claims);
    this.setRecord(lockMatchRecord(claims, Date.now()));
    ctx.saveState();
    log({ level: 'info', msg: 'tournament_match_locked', roomId: this.roomId, matchId: claims.mid });
  }

  /**
   * Applies the signed match's rules and room settings to the (lobby) game. Runs when the first ticket
   * locks the room and again before every start, so a lobby restored without them still plays the
   * tournament's rules.
   */
  private applyMatchRules(claims: Pick<MatchTicketClaims, 'match'>): void {
    const ctx = this.context();
    const previousSettings = ctx.roomSettings;
    const previousRuleset = ctx.game.rulesetConfig;
    ctx.game.setRulesetConfig(claims.match.rulesetConfig);
    const settings = ensureRoomSettings(
      { name: claims.match.label, isPublic: false, maxPlayers: matchTableSize(claims), rulesetConfig: ctx.game.rulesetConfig },
      previousSettings
    );
    ctx.setRoomSettings(settings);
    const settingsFact = roomSettingsChangedFact(null, previousSettings, settings);
    if (settingsFact) ctx.telemetry.record(settingsFact, ctx.game);
    const rulesetFact = rulesetChangedFact(null, previousRuleset, ctx.game.rulesetConfig);
    if (rulesetFact) ctx.telemetry.record(rulesetFact, ctx.game);
  }

  private startMatch(): void {
    const ctx = this.context();
    const now = Date.now();
    const record = this.requireRecord();

    if (isPastDeadline(record, now)) {
      this.expire(record, now);
      return;
    }

    if (!hasSeatedMembers(ctx, record)) {
      const forfeited: TournamentMatchRecord = {
        ...record,
        seats: record.seats.map((seat) => ({ ...seat, noShow: true })),
        autoStartAt: null,
        startedAt: now,
        reportedAt: now,
      };
      this.setRecord(forfeited);
      this.services.results.enqueue(buildForfeitReport(forfeited, now));
      log({ level: 'info', msg: 'tournament_match_forfeited', roomId: this.roomId, matchId: record.mid });
      ctx.broadcastPersonalizedState();
      return;
    }

    this.applyMatchRules(record);
    const seated = seatTableForStart(ctx, record);
    const started = ctx.useCases.startGame.execute({ game: ctx.game, playerId: ctx.game.hostId });
    // Only a started game marks the match started; a failed start is retried from the lobby.
    const startedRecord: TournamentMatchRecord = { ...seated, autoStartAt: null, startedAt: now };
    this.setRecord(startedRecord);
    this.reportProgress(startedRecord, ctx.game.currentRound, now);
    log({ level: 'info', msg: 'tournament_match_started', roomId: this.roomId, matchId: record.mid });
    ctx.broadcast(started.gameStartedEvent);
    ctx.broadcast(started.trumpRevealedEvent);
    ctx.broadcastPersonalizedState();
    ctx.saveState();
  }

  /**
   * The match deadline passed before the game could start: the server has voided the table by now
   * (a result could only come back superseded), so it never starts. The players see it expired.
   */
  private expire(record: TournamentMatchRecord, now: number): void {
    this.setRecord({ ...record, autoStartAt: null, expiredAt: now });
    log({ level: 'info', msg: 'tournament_match_expired', roomId: this.roomId, matchId: record.mid, deadlineAt: matchDeadline(record) });
    this.context().broadcastPersonalizedState();
  }

  private advanceRound(): void {
    const ctx = this.context();
    // The room advances on its own: no host needed (a bot may hold the host seat).
    const result = ctx.useCases.nextRound.executeOnTimeout({ game: ctx.game });
    if (!result) return;
    ctx.broadcast(result.trumpRevealedEvent);
    ctx.broadcastPersonalizedState();
    ctx.saveState();
  }
}
