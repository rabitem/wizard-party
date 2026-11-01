import { ALL_SUITS } from '../value-objects/card-types';
import { BOT_DIFFICULTY_LEVELS } from '../value-objects/bot-difficulty';
import { parseEffectResponse } from '../expansions/trick-effects';
import type { ICardDeclaration } from '../expansions/card-behavior';
import type { IRoomSettings } from '../entities/game';
import type { IRulesetConfig } from '../value-objects/ruleset-config';
import type { CustomSound, SoundboardSoundName } from '../constants/sound-options';
import {
  ClientCommandType,
  type ClientCommand,
  type ClientPhysicsState,
  type SoundPreferences,
} from './client-commands';
import { COMMAND_LIMITS, EMOTE_ID_PATTERN, maxFrameLengthFor } from './command-limits';
import { CommandFieldError, CommandFields, isUntrustedRecord, type UntrustedRecord } from './command-fields';
import { ProtocolErrorCode } from './protocol';

/**
 * The protocol boundary: turns an untrusted JSON value into a typed ClientCommand, or a refusal.
 *
 * Every command type has exactly one decoder (the table below is exhaustive, so adding a command
 * without a decoder does not compile). A decoder checks types, ranges, enums and lengths and copies
 * only the fields it knows. Nested objects the domain owns (room settings, rulesets, sounds, card
 * declarations) are checked to be objects here and normalized by the domain.
 */

export type CommandDecodeFailureCode =
  | typeof ProtocolErrorCode.INVALID_COMMAND
  | typeof ProtocolErrorCode.PAYLOAD_TOO_LARGE
  | 'UNKNOWN_COMMAND';

export interface CommandDecodeFailure {
  ok: false;
  code: CommandDecodeFailureCode;
  message: string;
  /** The `type` the frame claimed, when it was text (for telemetry). */
  commandType: string | null;
  /** The frame's requestId when it was valid, so the refusal can be correlated. */
  requestId: string | null;
}

export type CommandDecodeResult = { ok: true; command: ClientCommand } | CommandDecodeFailure;

type CommandOf<K extends ClientCommandType> = Extract<ClientCommand, { type: K }>;
type CommandBody<K extends ClientCommandType> = Omit<CommandOf<K>, 'type' | 'requestId'>;
type BodyDecoder<K extends ClientCommandType> = (fields: CommandFields) => CommandBody<K>;

const { MAX_ID_LENGTH } = COMMAND_LIMITS;
const ID = { max: MAX_ID_LENGTH };
const NO_FIELDS = () => ({});
const COMMAND_TYPES = Object.values(ClientCommandType) as readonly string[];

/** A nested object whose shape the domain normalizes; typed here as what the domain expects. */
function normalizedByDomain<T>(value: UntrustedRecord | undefined): T | undefined {
  return value as unknown as T | undefined;
}

function parseVector(value: unknown): { x: number; y: number; z: number } | null {
  if (!isUntrustedRecord(value)) return null;
  const { x, y, z } = value;
  const isCoordinate = (n: unknown): n is number =>
    typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= COMMAND_LIMITS.MAX_PHYSICS_MAGNITUDE;
  return isCoordinate(x) && isCoordinate(y) && isCoordinate(z) ? { x, y, z } : null;
}

function parsePhysicsState(value: unknown): ClientPhysicsState | null {
  if (!isUntrustedRecord(value)) return null;
  const throwVelocity = parseVector(value.throwVelocity);
  const landingPosition = parseVector(value.landingPosition);
  const startPosition = parseVector(value.startPosition);
  if (!throwVelocity || !landingPosition || !startPosition) return null;
  return { throwVelocity, landingPosition, startPosition };
}

const BODY_DECODERS: { [K in ClientCommandType]: BodyDecoder<K> } = {
  [ClientCommandType.JOIN_GAME]: (fields) => ({
    playerName: fields.string('playerName', { min: 0, max: COMMAND_LIMITS.MAX_PLAYER_NAME_LENGTH }),
    persistentId: fields.optionalString('persistentId', ID),
    sessionToken: fields.optionalString('sessionToken', { max: COMMAND_LIMITS.MAX_SESSION_TOKEN_LENGTH }),
    protocolVersion: fields.optionalInteger('protocolVersion', { min: 1, max: COMMAND_LIMITS.MAX_PROTOCOL_VERSION }),
    roomSettings: normalizedByDomain<IRoomSettings>(fields.optionalRecord('roomSettings')),
    tournamentTicket: fields.optionalString('tournamentTicket', { max: COMMAND_LIMITS.MAX_TOURNAMENT_TICKET_LENGTH }),
    appearanceTicket: fields.optionalString('appearanceTicket', { max: COMMAND_LIMITS.MAX_APPEARANCE_TICKET_LENGTH }),
  }),
  [ClientCommandType.LEAVE_GAME]: NO_FIELDS,
  [ClientCommandType.START_GAME]: NO_FIELDS,
  [ClientCommandType.REQUEST_STATE]: NO_FIELDS,
  [ClientCommandType.PING]: NO_FIELDS,
  [ClientCommandType.SET_ROOM_SETTINGS]: (fields) => ({
    roomSettings: fields.record('roomSettings') as unknown as IRoomSettings,
  }),
  [ClientCommandType.SET_RULESET]: (fields) => ({
    rulesetConfig: fields.record('rulesetConfig') as unknown as IRulesetConfig,
  }),
  [ClientCommandType.SET_READY]: (fields) => ({ ready: fields.boolean('ready') }),
  [ClientCommandType.KICK_PLAYER]: (fields) => ({ playerId: fields.string('playerId', ID) }),
  [ClientCommandType.TRANSFER_HOST]: (fields) => ({ playerId: fields.string('playerId', ID) }),
  [ClientCommandType.SELECT_TRUMP]: (fields) => ({ suit: fields.nullableOneOf('suit', ALL_SUITS) }),
  [ClientCommandType.PLACE_BID]: (fields) => ({ bid: fields.integer('bid', { min: 0, max: COMMAND_LIMITS.MAX_BID }) }),
  [ClientCommandType.PLAY_CARD]: (fields) => ({
    cardId: fields.string('cardId', ID),
    declaration: normalizedByDomain<ICardDeclaration>(fields.optionalRecord('declaration')),
    soundChoice: fields.optionalString('soundChoice', { max: COMMAND_LIMITS.MAX_SOUND_NAME_LENGTH }),
    customAudio: normalizedByDomain<CustomSound>(fields.optionalRecord('customAudio')),
    // The throw only animates the card: an unusable one (NaN velocity, a glitchy drag) is dropped.
    physicsState: fields.hint('physicsState', parsePhysicsState),
  }),
  [ClientCommandType.RESOLVE_EFFECT]: (fields) => ({ response: fields.parsed('response', parseEffectResponse) }),
  [ClientCommandType.NEXT_ROUND]: NO_FIELDS,
  [ClientCommandType.SEND_EMOTE]: (fields) => ({
    emoteId: fields.string('emoteId', { max: MAX_ID_LENGTH, pattern: EMOTE_ID_PATTERN }),
  }),
  [ClientCommandType.SEND_CHAT]: (fields) => ({
    message: fields.string('message', { max: COMMAND_LIMITS.MAX_CHAT_INPUT_LENGTH }),
  }),
  [ClientCommandType.REQUEST_REMATCH]: NO_FIELDS,
  [ClientCommandType.ADD_BOT]: (fields) => ({ difficulty: fields.optionalOneOf('difficulty', BOT_DIFFICULTY_LEVELS) }),
  [ClientCommandType.REMOVE_BOT]: (fields) => ({ botId: fields.string('botId', ID) }),
  [ClientCommandType.UPDATE_SOUND_PREFERENCES]: (fields) => ({
    preferences: fields.record('preferences') as unknown as SoundPreferences,
  }),
  [ClientCommandType.PLAY_TIMEOUT_SOUND]: (fields) => ({
    soundName: fields.optionalString('soundName', { max: COMMAND_LIMITS.MAX_SOUND_NAME_LENGTH }) as
      | SoundboardSoundName
      | undefined,
    customAudio: normalizedByDomain<CustomSound>(fields.optionalRecord('customAudio')),
  }),
};

export function isClientCommandType(value: unknown): value is ClientCommandType {
  return typeof value === 'string' && COMMAND_TYPES.includes(value);
}

/** Drops fields a decoder left undefined, so a decoded command holds only what was sent. */
function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as T;
}

function failure(
  code: CommandDecodeFailureCode,
  message: string,
  commandType: string | null = null,
  requestId: string | null = null
): CommandDecodeFailure {
  return { ok: false, code, message, commandType, requestId };
}

function readRequestId(source: UntrustedRecord): { ok: true; requestId: string | null } | { ok: false } {
  const { requestId } = source;
  // An empty id always meant "none" (older clients send it that way).
  if (requestId === undefined || requestId === null || requestId === '') return { ok: true, requestId: null };
  if (typeof requestId !== 'string' || requestId.length > COMMAND_LIMITS.MAX_REQUEST_ID_LENGTH) {
    return { ok: false };
  }
  return { ok: true, requestId };
}

/**
 * Decodes one parsed frame. `frameLength` (characters of the raw JSON) is checked against the
 * limit of the command's type; pass it whenever the raw frame is known.
 */
export function decodeClientCommand(value: unknown, frameLength = 0): CommandDecodeResult {
  if (!isUntrustedRecord(value)) {
    return failure(ProtocolErrorCode.INVALID_COMMAND, 'Command must be a JSON object');
  }
  const { type } = value;
  if (typeof type !== 'string') {
    return failure(ProtocolErrorCode.INVALID_COMMAND, 'Command type must be a string');
  }
  const request = readRequestId(value);
  if (!request.ok) {
    return failure(ProtocolErrorCode.INVALID_COMMAND, `requestId must be text of at most ${COMMAND_LIMITS.MAX_REQUEST_ID_LENGTH} characters`, type);
  }
  const { requestId } = request;
  if (!isClientCommandType(type)) {
    return failure('UNKNOWN_COMMAND', 'Unknown command type', type, requestId);
  }
  if (frameLength > maxFrameLengthFor(type)) {
    return failure(ProtocolErrorCode.PAYLOAD_TOO_LARGE, `${type} is too large`, type, requestId);
  }

  try {
    const decode = BODY_DECODERS[type] as (fields: CommandFields) => object;
    const body = decode(new CommandFields(value));
    const command = { type, ...(requestId ? { requestId } : {}), ...withoutUndefined(body) };
    return { ok: true, command: command as ClientCommand };
  } catch (error) {
    if (!(error instanceof CommandFieldError)) throw error;
    return failure(ProtocolErrorCode.INVALID_COMMAND, `Invalid ${type}: ${error.message}`, type, requestId);
  }
}
