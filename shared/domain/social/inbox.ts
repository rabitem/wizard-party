import type { CharacterAppearance } from '../character';
import { isMatchId, isTournamentId, normalizeInviteCode } from '../tournament/tournament-ids';
import { TOURNAMENT_LIMITS, TOURNAMENT_TIMING } from '../tournament/tournament.constants';
import { isRoomCode } from './presence';
import { SOCIAL_LIMITS } from './social.constants';

/*
 * The generic inbox. Every notification is an item of a registered kind with a typed payload.
 * A new kind (season rewards, tournament calls, system messages, ...) is one entry in
 * InboxPayloads + INBOX_KINDS, an action handler on the server (if it has actions) and a renderer
 * on the client. Storage, delivery, read state, dedupe and expiry are shared.
 */

/** Your table in a tournament round is ready: "Join" opens the tournament and takes the seat. */
export interface TournamentTableReadyPayload {
  tournamentId: string;
  name: string;
  matchId: string;
  round: number;
  /** "Round 2", "Final", ... */
  roundLabel: string;
}

/** A tournament you played in finished: your placement and the awards you earned. */
export interface TournamentFinishedPayload {
  tournamentId: string;
  name: string;
  /** Final rank; null for a host who did not play. */
  rank: number | null;
  entrants: number;
  /** Award ids (TOURNAMENT_AWARDS) earned by the recipient. */
  awards: string[];
}

/** The host invites you to register ("Register" signs you up, with the code if private). */
export interface TournamentInvitePayload {
  tournamentId: string;
  name: string;
  /** Present for private tournaments. */
  inviteCode: string | null;
}

export interface InboxPayloads {
  friend_request: Record<string, never>;
  friend_accepted: Record<string, never>;
  game_invite: { roomCode: string };
  tournament_table_ready: TournamentTableReadyPayload;
  tournament_finished: TournamentFinishedPayload;
  tournament_invite: TournamentInvitePayload;
}

export type InboxKind = keyof InboxPayloads;
export type InboxAction = 'accept' | 'decline';

export interface InboxKindDefinition<K extends InboxKind> {
  /** Actions the recipient can take; an item without actions is informational. */
  actions: readonly InboxAction[];
  /** Items expire after this long (null: never). */
  ttlMs: number | null;
  /** Validates a stored payload; null drops the item (corrupt or from an incompatible version). */
  parsePayload(raw: unknown): InboxPayloads[K] | null;
  /**
   * One item per (recipient, dedupe key): a repeat replaces the older item instead of piling up.
   * Derived from the actor, so an item can be withdrawn without knowing its payload. Kinds without
   * an actor (system notifications) key on the payload instead and return null without one.
   */
  dedupeKey(actorId: string | null, payload?: unknown): string | null;
}

const emptyPayload = (): Record<string, never> => ({});

const MAX_ROUND_LABEL_LENGTH = 40;
const MAX_AWARDS_PER_ITEM = 16;
const AWARD_ID = /^[a-z0-9-]{1,32}$/;

function record(raw: unknown): Record<string, unknown> | null {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

function text(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function positiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

/** Tournament items replace the previous item of the same tournament (one per kind and tournament). */
function tournamentKey(kind: string) {
  return (_actorId: string | null, payload?: unknown): string | null => {
    const tournamentId = record(payload)?.tournamentId;
    return isTournamentId(tournamentId) ? `${kind}:${tournamentId}` : null;
  };
}

export const INBOX_KINDS: { [K in InboxKind]: InboxKindDefinition<K> } = {
  friend_request: {
    actions: ['accept', 'decline'],
    ttlMs: null,
    parsePayload: emptyPayload,
    dedupeKey: (actorId) => `friend_request:${actorId}`,
  },
  friend_accepted: {
    actions: [],
    ttlMs: null,
    parsePayload: emptyPayload,
    dedupeKey: (actorId) => `friend_accepted:${actorId}`,
  },
  game_invite: {
    actions: ['accept', 'decline'],
    ttlMs: SOCIAL_LIMITS.GAME_INVITE_TTL_MS,
    parsePayload: (raw) => {
      const roomCode = (raw as { roomCode?: unknown } | null)?.roomCode;
      return isRoomCode(roomCode) ? { roomCode } : null;
    },
    // One live invite per sender: a new room replaces the old invite.
    dedupeKey: (actorId) => `game_invite:${actorId}`,
  },
  tournament_table_ready: {
    actions: ['accept'],
    // A table that is still pending after this long has been voided.
    ttlMs: TOURNAMENT_TIMING.MATCH_HARD_TIMEOUT_MS,
    parsePayload: (raw) => {
      const value = record(raw);
      if (!value || !isTournamentId(value.tournamentId) || !isMatchId(value.matchId)) return null;
      if (!text(value.name, TOURNAMENT_LIMITS.NAME_MAX_LENGTH) || !positiveInt(value.round) || !text(value.roundLabel, MAX_ROUND_LABEL_LENGTH)) return null;
      return { tournamentId: value.tournamentId, name: value.name, matchId: value.matchId, round: value.round, roundLabel: value.roundLabel };
    },
    // The next round's table replaces the previous one.
    dedupeKey: tournamentKey('tournament_table_ready'),
  },
  tournament_finished: {
    actions: [],
    ttlMs: null,
    parsePayload: (raw) => {
      const value = record(raw);
      if (!value || !isTournamentId(value.tournamentId) || !text(value.name, TOURNAMENT_LIMITS.NAME_MAX_LENGTH)) return null;
      const { rank, entrants, awards } = value;
      if (!(rank === null || positiveInt(rank)) || !positiveInt(entrants)) return null;
      if (!Array.isArray(awards) || awards.length > MAX_AWARDS_PER_ITEM) return null;
      if (!awards.every((id): id is string => typeof id === 'string' && AWARD_ID.test(id))) return null;
      return { tournamentId: value.tournamentId, name: value.name, rank, entrants, awards: [...awards] };
    },
    dedupeKey: tournamentKey('tournament_finished'),
  },
  tournament_invite: {
    actions: ['accept', 'decline'],
    ttlMs: TOURNAMENT_TIMING.INVITE_TTL_MS,
    parsePayload: (raw) => {
      const value = record(raw);
      if (!value || !isTournamentId(value.tournamentId) || !text(value.name, TOURNAMENT_LIMITS.NAME_MAX_LENGTH)) return null;
      const inviteCode = value.inviteCode === null || value.inviteCode === undefined ? null : normalizeInviteCode(value.inviteCode);
      if (value.inviteCode !== null && value.inviteCode !== undefined && inviteCode === null) return null;
      return { tournamentId: value.tournamentId, name: value.name, inviteCode };
    },
    // One invite per tournament: inviting again refreshes it instead of stacking.
    dedupeKey: tournamentKey('tournament_invite'),
  },
};

export function isInboxKind(value: unknown): value is InboxKind {
  return typeof value === 'string' && Object.hasOwn(INBOX_KINDS, value);
}

/** The other player behind an item, as shown in the inbox. */
export interface InboxActor {
  userId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  appearance: CharacterAppearance;
  level: number;
}

interface InboxItemBase<K extends InboxKind> {
  id: string;
  kind: K;
  actor: InboxActor | null;
  payload: InboxPayloads[K];
  createdAt: number;
  readAt: number | null;
  expiresAt: number | null;
  resolvedAt: number | null;
  resolution: InboxAction | 'cancelled' | null;
}

/** Discriminated by `kind`, so `item.kind === 'game_invite'` narrows the payload. */
export type InboxItem = { [K in InboxKind]: InboxItemBase<K> }[InboxKind];

/** Item to deliver; the repository assigns id and timestamps. */
export type InboxDelivery = {
  [K in InboxKind]: { userId: string; kind: K; actorId: string | null; payload: InboxPayloads[K] };
}[InboxKind];

export type InboxItemState = 'actionable' | 'info' | 'resolved' | 'expired';

export function inboxItemState(item: InboxItem, now: number): InboxItemState {
  if (item.resolvedAt !== null) return 'resolved';
  if (item.expiresAt !== null && item.expiresAt <= now) return 'expired';
  return INBOX_KINDS[item.kind].actions.length > 0 ? 'actionable' : 'info';
}

/** Pass the payload when delivering: kinds without an actor derive their key from it. */
export function inboxDedupeKey(kind: InboxKind, actorId: string | null, payload?: unknown): string | null {
  return INBOX_KINDS[kind].dedupeKey(actorId, payload);
}

export function inboxExpiry(kind: InboxKind, now: number): number | null {
  const { ttlMs } = INBOX_KINDS[kind];
  return ttlMs === null ? null : now + ttlMs;
}

export function canPerformInboxAction(item: InboxItem, action: InboxAction, now: number): boolean {
  return inboxItemState(item, now) === 'actionable' && INBOX_KINDS[item.kind].actions.includes(action);
}
