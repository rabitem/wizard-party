import { BotDifficulty } from '../bot-ai/types';
import { DEFAULT_RULESET_CONFIG, type IRulesetConfig } from '../value-objects/ruleset-config';
import { validateRulesetConfig } from '../value-objects/ruleset-validation';
import { getTournamentFormat } from './formats';
import { TOURNAMENT_LIMITS } from './tournament.constants';
import { TournamentError } from './tournament-error';
import {
  TOURNAMENT_FORMAT_IDS,
  TOURNAMENT_VISIBILITIES,
  type TournamentFormatId,
  type TournamentSettings,
  type TournamentVisibility,
} from './tournament.types';

/** Everything a host chooses; validated, normalized and complete. */
export interface TournamentDraft {
  name: string;
  description: string;
  format: TournamentFormatId;
  settings: TournamentSettings;
  visibility: TournamentVisibility;
  startsAt: number | null;
}

export const DEFAULT_TOURNAMENT_SETTINGS: TournamentSettings = Object.freeze({
  maxEntrants: TOURNAMENT_LIMITS.DEFAULT_MAX_ENTRANTS,
  maxTableSize: TOURNAMENT_LIMITS.DEFAULT_MAX_TABLE_SIZE,
  rounds: TOURNAMENT_LIMITS.DEFAULT_ROUNDS,
  advancePerTable: null,
  rulesetConfig: DEFAULT_RULESET_CONFIG,
  fillWithBots: false,
  botDifficulty: BotDifficulty.MEDIUM,
});

const BOT_DIFFICULTIES = new Set<number>(Object.values(BotDifficulty).filter((value): value is number => typeof value === 'number'));

// Control characters, zero-width and bidi overrides: invisible text that can spoof names.
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤﻿]/g;

/** Length in code points, as Postgres char_length counts it (an emoji is one, not two UTF-16 units). */
function characterCount(text: string): number {
  return [...text].length;
}

function invalid(message: string): never {
  throw new TournamentError('invalid_input', message);
}

/** Single line: invisible characters removed, whitespace collapsed, trimmed. */
export function sanitizeTournamentName(value: unknown): string {
  if (typeof value !== 'string') invalid('Give the tournament a name.');
  const name = value.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
  const length = characterCount(name);
  if (length < TOURNAMENT_LIMITS.NAME_MIN_LENGTH || length > TOURNAMENT_LIMITS.NAME_MAX_LENGTH) {
    invalid(`Names need ${TOURNAMENT_LIMITS.NAME_MIN_LENGTH}–${TOURNAMENT_LIMITS.NAME_MAX_LENGTH} characters.`);
  }
  return name;
}

/** Up to two consecutive line breaks are kept; everything else like a name. */
export function sanitizeTournamentDescription(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') invalid('The description must be text.');
  const description = value
    .replace(/\r\n?/g, '\n')
    .replace(INVISIBLE, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (characterCount(description) > TOURNAMENT_LIMITS.DESCRIPTION_MAX_LENGTH) {
    invalid(`Descriptions are limited to ${TOURNAMENT_LIMITS.DESCRIPTION_MAX_LENGTH} characters.`);
  }
  return description;
}

function intInRange(value: unknown, min: number, max: number, message: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) invalid(message);
  return value;
}

function parseFormat(value: unknown): TournamentFormatId {
  if (!TOURNAMENT_FORMAT_IDS.includes(value as TournamentFormatId)) invalid(`format must be one of ${TOURNAMENT_FORMAT_IDS.join(', ')}.`);
  return value as TournamentFormatId;
}

function parseVisibility(value: unknown): TournamentVisibility {
  if (!TOURNAMENT_VISIBILITIES.includes(value as TournamentVisibility)) invalid('visibility must be public or private.');
  return value as TournamentVisibility;
}

function parseRuleset(value: unknown): IRulesetConfig {
  const result = validateRulesetConfig(value);
  if (!result.success) invalid(`Invalid rules: ${result.errors.slice(0, 3).join('; ')}`);
  return result.data;
}

/** startsAt: epoch ms (or an ISO string), null to clear. Must lie in the allowed window. */
export function parseStartsAt(value: unknown, now: number): number | null {
  if (value === null || value === undefined || value === '') return null;
  const time = typeof value === 'string' ? Date.parse(value) : value;
  if (typeof time !== 'number' || !Number.isFinite(time)) invalid('startsAt must be a date.');
  const startsAt = Math.trunc(time);
  if (startsAt < now + TOURNAMENT_LIMITS.STARTS_AT_MIN_AHEAD_MS) invalid('The start time must be in the future.');
  if (startsAt > now + TOURNAMENT_LIMITS.STARTS_AT_MAX_AHEAD_MS) invalid('Tournaments can be scheduled up to 60 days ahead.');
  return startsAt;
}

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (value === undefined) return {};
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid(`${what} must be an object.`);
  return value as Record<string, unknown>;
}

function parseAdvancePerTable(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return intInRange(value, 1, TOURNAMENT_LIMITS.MAX_TABLE_SIZE - 1, 'advancePerTable must be a small whole number.');
}

function parseBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') invalid(`${field} must be true or false.`);
  return value;
}

function parseBotDifficulty(value: unknown): BotDifficulty {
  if (!BOT_DIFFICULTIES.has(value as number)) invalid('Unknown bot difficulty.');
  return value as BotDifficulty;
}

/** Applies the given setting fields over `base`, validating each. Unknown fields are ignored. */
export function parseTournamentSettings(input: unknown, base: TournamentSettings = DEFAULT_TOURNAMENT_SETTINGS): TournamentSettings {
  const raw = asRecord(input, 'settings');
  const has = (key: string) => Object.hasOwn(raw, key) && raw[key] !== undefined;
  const { MIN_TABLE_SIZE, MAX_TABLE_SIZE, MAX_ENTRANTS_LOWER_BOUND, MAX_ENTRANTS, MIN_ROUNDS, MAX_ROUNDS } = TOURNAMENT_LIMITS;
  return {
    maxEntrants: has('maxEntrants')
      ? intInRange(raw.maxEntrants, MAX_ENTRANTS_LOWER_BOUND, MAX_ENTRANTS, `Allow ${MAX_ENTRANTS_LOWER_BOUND}–${MAX_ENTRANTS} players.`)
      : base.maxEntrants,
    maxTableSize: has('maxTableSize')
      ? intInRange(raw.maxTableSize, MIN_TABLE_SIZE, MAX_TABLE_SIZE, `Tables seat ${MIN_TABLE_SIZE}–${MAX_TABLE_SIZE} players.`)
      : base.maxTableSize,
    rounds: has('rounds') ? intInRange(raw.rounds, MIN_ROUNDS, MAX_ROUNDS, `Play ${MIN_ROUNDS}–${MAX_ROUNDS} rounds.`) : base.rounds,
    // null (or omitted with the key present) switches back to the default of half the table.
    advancePerTable: Object.hasOwn(raw, 'advancePerTable') ? parseAdvancePerTable(raw.advancePerTable) : base.advancePerTable,
    rulesetConfig: has('rulesetConfig') ? parseRuleset(raw.rulesetConfig) : base.rulesetConfig,
    fillWithBots: has('fillWithBots') ? parseBoolean(raw.fillWithBots, 'fillWithBots') : base.fillWithBots,
    botDifficulty: has('botDifficulty') ? parseBotDifficulty(raw.botDifficulty) : base.botDifficulty,
  };
}

function checkFormatSettings(draft: TournamentDraft): TournamentDraft {
  const problem = getTournamentFormat(draft.format).validateSettings(draft.settings);
  if (problem) invalid(problem);
  return draft;
}

/** Validates a create request; missing optional fields take the defaults. */
export function parseTournamentDraft(input: unknown, now: number): TournamentDraft {
  const raw = asRecord(input, 'body');
  return checkFormatSettings({
    name: sanitizeTournamentName(raw.name),
    description: sanitizeTournamentDescription(raw.description),
    format: raw.format === undefined ? 'series' : parseFormat(raw.format),
    settings: parseTournamentSettings(raw.settings),
    visibility: raw.visibility === undefined ? 'public' : parseVisibility(raw.visibility),
    startsAt: parseStartsAt(raw.startsAt, now),
  });
}

/**
 * Validates an update request against the current draft: only the fields present change.
 * Returns the complete, validated next draft.
 */
export function parseTournamentChanges(input: unknown, current: TournamentDraft, now: number): TournamentDraft {
  const raw = asRecord(input, 'body');
  const has = (key: string) => Object.hasOwn(raw, key) && raw[key] !== undefined;
  return checkFormatSettings({
    name: has('name') ? sanitizeTournamentName(raw.name) : current.name,
    description: Object.hasOwn(raw, 'description') ? sanitizeTournamentDescription(raw.description) : current.description,
    format: has('format') ? parseFormat(raw.format) : current.format,
    settings: has('settings') ? parseTournamentSettings(raw.settings, current.settings) : current.settings,
    visibility: has('visibility') ? parseVisibility(raw.visibility) : current.visibility,
    startsAt: Object.hasOwn(raw, 'startsAt') ? parseStartsAt(raw.startsAt, now) : current.startsAt,
  });
}
