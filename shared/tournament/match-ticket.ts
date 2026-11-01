import { BotDifficulty } from '../domain/bot-ai/types';
import { PlayerNameService } from '../domain/services/player-name.service';
import { isTournamentId, matchRoomCode, parseMatchId } from '../domain/tournament/tournament-ids';
import { TOURNAMENT_LIMITS } from '../domain/tournament/tournament.constants';
import type { IRulesetConfig } from '../domain/value-objects/ruleset-config';
import { validateRulesetConfig } from '../domain/value-objects/ruleset-validation';
import { base64UrlToBytes, base64UrlToText, bytesToBase64Url, textToBase64Url } from './base64url';
import { hmacSign, hmacVerify } from './hmac';
import { MATCH_TICKET_PREFIX, SIGNING_CONTEXT, TOURNAMENT_WIRE_LIMITS, TOURNAMENT_WIRE_VERSION } from './tournament-wire';

/*
 * Match tickets: the server's signed statement "account <uid> may take a seat named <name> in
 * room <room> for match <mid> until <exp>". The worker verifies the signature with the shared
 * TOURNAMENT_SECRET and never trusts anything else the browser says. Every roster member's ticket
 * carries the identical match descriptor, so whoever joins first configures the room.
 */

export interface MatchTicketSeat {
  uid: string;
  /** Seat name (unique at the table, valid for the game). */
  name: string;
  /** Seat index in deal order; bots fill the seats no roster member holds. */
  seat: number;
}

export interface MatchDescriptor {
  round: number;
  table: number;
  /** The humans of the table. */
  roster: MatchTicketSeat[];
  bots: number;
  botDifficulty: BotDifficulty;
  rulesetConfig: IRulesetConfig;
  /** Caption, e.g. "Spring Cup · Round 2 · Table 3". */
  label: string;
  /**
   * The match deadline (epoch ms): the server voids the table if it is still unfinished then.
   * Absent in tickets issued before it was part of the descriptor; those stay valid.
   */
  deadlineAt?: number;
}

export interface MatchTicketClaims {
  v: typeof TOURNAMENT_WIRE_VERSION;
  /** Tournament id. */
  tid: string;
  /** Match id. */
  mid: string;
  /** Room code; always matchRoomCode(mid). */
  room: string;
  /** Account the ticket was issued to. */
  uid: string;
  /** That account's seat name (equals its roster entry). */
  name: string;
  /** Expiry, epoch ms. */
  exp: number;
  match: MatchDescriptor;
}

export type MatchTicketRejection = 'malformed' | 'bad_signature' | 'invalid_claims' | 'expired' | 'wrong_room';

/**
 * An expired ticket still carries its (authentic, same-room) claims: it no longer seats anybody,
 * but it still proves the account, so the worker lets it take back a seat the account already holds.
 */
export type MatchTicketVerification =
  | { ok: true; claims: MatchTicketClaims }
  | { ok: false; reason: 'expired'; claims: MatchTicketClaims }
  | { ok: false; reason: Exclude<MatchTicketRejection, 'expired'> };

const BOT_DIFFICULTIES = new Set<unknown>(Object.values(BotDifficulty).filter((value) => typeof value === 'number'));

function isInt(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function isUserId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= TOURNAMENT_WIRE_LIMITS.MAX_USER_ID_LENGTH;
}

function isSeatName(value: unknown): value is string {
  return typeof value === 'string' && PlayerNameService.validate(value).sanitizedName === value;
}

function parseRoster(value: unknown, tableSize: number): MatchTicketSeat[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > tableSize) return null;
  const uids = new Set<string>();
  const seats = new Set<number>();
  const names = new Set<string>();
  const roster: MatchTicketSeat[] = [];
  for (const entry of value) {
    const { uid, name, seat } = (entry ?? {}) as Record<string, unknown>;
    if (!isUserId(uid) || !isSeatName(name) || !isInt(seat, 0, tableSize - 1)) return null;
    const key = PlayerNameService.normalize(name);
    if (uids.has(uid) || seats.has(seat) || names.has(key)) return null;
    uids.add(uid);
    seats.add(seat);
    names.add(key);
    roster.push({ uid, name, seat });
  }
  return roster;
}

function parseDescriptor(value: unknown, round: number, table: number): MatchDescriptor | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (raw.round !== round || raw.table !== table) return null;
  if (!isInt(raw.bots, 0, TOURNAMENT_LIMITS.MAX_TABLE_SIZE - 1) || !BOT_DIFFICULTIES.has(raw.botDifficulty)) return null;
  if (typeof raw.label !== 'string' || raw.label.length === 0 || raw.label.length > TOURNAMENT_WIRE_LIMITS.MAX_LABEL_LENGTH) return null;
  if (!Array.isArray(raw.roster)) return null;
  const tableSize = raw.roster.length + raw.bots;
  if (tableSize < TOURNAMENT_LIMITS.MIN_TABLE_SIZE || tableSize > TOURNAMENT_LIMITS.MAX_TABLE_SIZE) return null;
  const { deadlineAt } = raw;
  if (deadlineAt !== undefined && !isInt(deadlineAt, 0, Number.MAX_SAFE_INTEGER)) return null;
  const roster = parseRoster(raw.roster, tableSize);
  const rules = validateRulesetConfig(raw.rulesetConfig);
  if (!roster || !rules.success) return null;
  const descriptor: MatchDescriptor = { round, table, roster, bots: raw.bots, botDifficulty: raw.botDifficulty as BotDifficulty, rulesetConfig: rules.data, label: raw.label };
  return isInt(deadlineAt, 0, Number.MAX_SAFE_INTEGER) ? { ...descriptor, deadlineAt } : descriptor;
}

/**
 * Structural validation of decoded claims, including every binding: the match id belongs to the
 * tournament, the room is the match's room, the holder is on the roster under the same name.
 */
export function parseMatchTicketClaims(value: unknown): MatchTicketClaims | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (raw.v !== TOURNAMENT_WIRE_VERSION || !isTournamentId(raw.tid)) return null;
  const match = parseMatchId(raw.mid);
  if (!match || match.tournamentId !== raw.tid || typeof raw.mid !== 'string') return null;
  if (raw.room !== matchRoomCode(raw.mid)) return null;
  if (!isUserId(raw.uid) || !isSeatName(raw.name) || !isInt(raw.exp, 0, Number.MAX_SAFE_INTEGER)) return null;
  const descriptor = parseDescriptor(raw.match, match.round, match.table);
  if (!descriptor) return null;
  const holder = descriptor.roster.find((entry) => entry.uid === raw.uid);
  if (!holder || holder.name !== raw.name) return null;
  return { v: TOURNAMENT_WIRE_VERSION, tid: raw.tid, mid: raw.mid, room: raw.room, uid: raw.uid, name: raw.name, exp: raw.exp, match: descriptor };
}

export async function signMatchTicket(secret: string, claims: MatchTicketClaims): Promise<string> {
  const payload = textToBase64Url(JSON.stringify(claims));
  const signed = `${MATCH_TICKET_PREFIX}.${payload}`;
  const signature = await hmacSign(secret, `${SIGNING_CONTEXT.TICKET}${signed}`);
  return `${signed}.${bytesToBase64Url(signature)}`;
}

export interface VerifyMatchTicketInput {
  secret: string;
  ticket: unknown;
  now: number;
  /** The room the ticket is presented in. */
  roomCode: string;
}

/** Signature first (nothing unauthenticated is parsed further), then claims, room and expiry. */
export async function verifyMatchTicket({ secret, ticket, now, roomCode }: VerifyMatchTicketInput): Promise<MatchTicketVerification> {
  if (typeof ticket !== 'string' || ticket.length > TOURNAMENT_WIRE_LIMITS.MAX_TICKET_LENGTH) return { ok: false, reason: 'malformed' };
  const parts = ticket.split('.');
  if (parts.length !== 3 || parts[0] !== MATCH_TICKET_PREFIX) return { ok: false, reason: 'malformed' };
  const signature = base64UrlToBytes(parts[2]);
  if (!signature) return { ok: false, reason: 'malformed' };
  if (!(await hmacVerify(secret, `${SIGNING_CONTEXT.TICKET}${parts[0]}.${parts[1]}`, signature))) return { ok: false, reason: 'bad_signature' };

  const json = base64UrlToText(parts[1]);
  let decoded: unknown;
  try {
    decoded = json === null ? null : JSON.parse(json);
  } catch {
    decoded = null;
  }
  const claims = parseMatchTicketClaims(decoded);
  if (!claims) return { ok: false, reason: 'invalid_claims' };
  if (claims.room !== roomCode) return { ok: false, reason: 'wrong_room' };
  if (claims.exp <= now) return { ok: false, reason: 'expired', claims };
  return { ok: true, claims };
}

/** Two tickets describe the same match (the worker locks a room to the first descriptor it saw). */
export function isSameMatch(a: Pick<MatchTicketClaims, 'tid' | 'mid' | 'room'>, b: Pick<MatchTicketClaims, 'tid' | 'mid' | 'room'>): boolean {
  return a.tid === b.tid && a.mid === b.mid && a.room === b.room;
}
