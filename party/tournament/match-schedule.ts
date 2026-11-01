import { GamePhase, getTrickPresentationMs, type Game, type Player } from '../../shared/domain';
import { TOURNAMENT_TIMING } from '../../shared/domain/tournament';
import { matchDeadline, noShowDeadline, updateSeat, type MatchSeatRecord, type TournamentMatchRecord } from './match-record';
import { TOURNAMENT_ROOM_TIMING } from './match-room.constants';

/*
 * The clock of a match room: when it starts by itself and when a finished round moves on. Pure
 * functions over the record and the (read-only) game, so the controller only has to persist the
 * result and arm one alarm for the earliest deadline.
 */

export function seatPlayer(game: Game, seat: MatchSeatRecord): Player | undefined {
  return seat.playerId === null ? undefined : game.getPlayer(seat.playerId);
}

/** The member sits at the table in person: connected, not in a reconnect grace, not replaced by a bot. */
export function isSeatOccupied(game: Game, seat: MatchSeatRecord): boolean {
  if (seat.noShow) return false;
  const player = seatPlayer(game, seat);
  return player !== undefined && !player.isBot && player.isConnected && !game.isPlayerGraced(player.id);
}

/** The host can press "next round": a connected human. */
function isHostPresent(game: Game): boolean {
  const host = game.getPlayer(game.hostId);
  return host !== undefined && !host.isBot && host.isConnected;
}

function reconcileCountdown(record: TournamentMatchRecord, game: Game, now: number): TournamentMatchRecord {
  if (record.startedAt !== null || record.expiredAt !== null || game.phase !== GamePhase.LOBBY) {
    return record.autoStartAt === null ? record : { ...record, autoStartAt: null };
  }
  const everyoneSeated = record.seats.every((seat) => isSeatOccupied(game, seat));
  const autoStartAt = everyoneSeated ? record.autoStartAt ?? now + TOURNAMENT_TIMING.AUTO_START_COUNTDOWN_MS : null;
  return autoStartAt === record.autoStartAt ? record : { ...record, autoStartAt };
}

function reconcileBotTakeovers(record: TournamentMatchRecord, game: Game): TournamentMatchRecord {
  if (record.startedAt === null) return record;
  return record.seats.reduce((next, seat) => {
    if (seat.noShow || seat.botTakeover || !seatPlayer(game, seat)?.isBot) return next;
    return updateSeat(next, seat.uid, { botTakeover: true });
  }, record);
}

function reconcileRoundEnd(record: TournamentMatchRecord, game: Game, now: number): TournamentMatchRecord {
  if (game.phase !== GamePhase.ROUND_END) return record.roundEnd === null ? record : { ...record, roundEnd: null };
  if (record.roundEnd?.round === game.currentRound) return record;
  return { ...record, roundEnd: { round: game.currentRound, since: now } };
}

/**
 * Brings the record in line with the game after any change: (re)starts or cancels the start
 * countdown, marks seats a bot took over, and notes when the current round ended. Returns the
 * same record when nothing changed.
 */
export function reconcileMatchRecord(record: TournamentMatchRecord, game: Game, now: number): TournamentMatchRecord {
  return reconcileRoundEnd(reconcileBotTakeovers(reconcileCountdown(record, game, now), game), game, now);
}

export interface MatchDeadlines {
  /** Start the match (countdown over or no-show deadline reached), or expire it (match deadline passed). */
  start: number | null;
  /** Advance a finished round on the host's behalf. */
  roundAdvance: number | null;
}

function earliest(...times: (number | null)[]): number | null {
  const set = times.filter((time): time is number => time !== null);
  return set.length > 0 ? Math.min(...set) : null;
}

export function matchDeadlines(record: TournamentMatchRecord, game: Game): MatchDeadlines {
  const waiting = record.startedAt === null && record.expiredAt === null && game.phase === GamePhase.LOBBY;
  const roundEnded = record.roundEnd !== null && game.phase === GamePhase.ROUND_END;
  // Without a host, counted from when the tables have collected the round's last trick.
  const advanceDelay = isHostPresent(game)
    ? TOURNAMENT_ROOM_TIMING.ROUND_END_AUTO_ADVANCE_MS
    : getTrickPresentationMs(game.players.length) + TOURNAMENT_ROOM_TIMING.HOSTLESS_ROUND_END_ADVANCE_MS;
  return {
    start: waiting ? earliest(record.autoStartAt, noShowDeadline(record), matchDeadline(record)) : null,
    roundAdvance: roundEnded && record.roundEnd ? record.roundEnd.since + advanceDelay : null,
  };
}

export function nextMatchDeadline(deadlines: MatchDeadlines): number | null {
  return earliest(deadlines.start, deadlines.roundAdvance);
}
