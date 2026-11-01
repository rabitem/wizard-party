import type { TournamentDetailView } from '@shared/application/use-cases/tournament';
import type { BotDifficulty } from '@shared/domain/bot-ai/types';
import {
  DEFAULT_TOURNAMENT_SETTINGS,
  TOURNAMENT_LIMITS,
  getTournamentFormat,
  parseStartsAt,
  sanitizeTournamentDescription,
  sanitizeTournamentName,
  type TournamentFormatId,
  type TournamentSettings,
  type TournamentVisibility,
} from '@shared/domain/tournament';
import type { IRulesetConfig } from '@shared/domain/value-objects/ruleset-config';

import type { TournamentChangesInput, TournamentDraftInput } from '@/lib/tournament';
import { TOURNAMENT_UI } from '@/presentation/config/tournament.config';

/*
 * State of the create / edit form and its mapping to the API bodies. Validation runs the domain's
 * own parsers (the server runs the same ones), so the form can never disagree with the server.
 */

export interface TournamentFormState {
  name: string;
  description: string;
  format: TournamentFormatId;
  visibility: TournamentVisibility;
  /** Scheduled start on; `startsAtLocal` is a datetime-local value in the viewer's zone. */
  scheduled: boolean;
  startsAtLocal: string;
  maxEntrants: number;
  maxTableSize: number;
  rounds: number;
  /** null = half of each table. */
  advancePerTable: number | null;
  fillWithBots: boolean;
  botDifficulty: BotDifficulty;
  rulesetConfig: IRulesetConfig;
  /** Create only: the host plays too. */
  joinAsEntrant: boolean;
}

export type TournamentFormField = 'name' | 'description' | 'startsAt' | 'settings';
export type TournamentFormErrors = Partial<Record<TournamentFormField, string>>;

const pad = (value: number) => String(value).padStart(2, '0');

/** Epoch ms -> 'YYYY-MM-DDTHH:mm' in the local time zone (value of an <input type="datetime-local">). */
export function toLocalDateTimeInput(epochMs: number): string {
  const date = new Date(epochMs);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** datetime-local value -> epoch ms (local time zone), null when empty or not a date. */
export function fromLocalDateTimeInput(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hours, minutes] = match.map(Number);
  const date = new Date(year, month - 1, day, hours, minutes);
  // Reject overflowing values such as 2026-02-31 (Date would roll them over).
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date.getTime();
}

/** The settings object of the form (also used for the live structure preview). */
export function formSettings(state: TournamentFormState): TournamentSettings {
  return {
    maxEntrants: state.maxEntrants,
    maxTableSize: state.maxTableSize,
    rounds: state.rounds,
    advancePerTable: state.advancePerTable,
    rulesetConfig: state.rulesetConfig,
    fillWithBots: state.fillWithBots,
    botDifficulty: state.botDifficulty,
  };
}

/** A fresh form: domain defaults, public, starting in an hour (scheduling off). */
export function initialFormState(now: number): TournamentFormState {
  const settings = DEFAULT_TOURNAMENT_SETTINGS;
  return {
    name: '',
    description: '',
    format: 'series',
    visibility: 'public',
    scheduled: false,
    startsAtLocal: toLocalDateTimeInput(now + TOURNAMENT_UI.DEFAULT_START_OFFSET_MS),
    maxEntrants: settings.maxEntrants,
    maxTableSize: settings.maxTableSize,
    rounds: settings.rounds,
    advancePerTable: settings.advancePerTable,
    fillWithBots: settings.fillWithBots,
    botDifficulty: settings.botDifficulty,
    rulesetConfig: settings.rulesetConfig,
    joinAsEntrant: true,
  };
}

/** The edit form of an existing tournament. */
export function formStateFromTournament(tournament: TournamentDetailView['tournament'], now: number): TournamentFormState {
  const { settings } = tournament;
  return {
    name: tournament.name,
    description: tournament.description,
    format: tournament.format,
    visibility: tournament.visibility,
    scheduled: tournament.startsAt !== null,
    startsAtLocal: toLocalDateTimeInput(tournament.startsAt ?? now + TOURNAMENT_UI.DEFAULT_START_OFFSET_MS),
    maxEntrants: settings.maxEntrants,
    maxTableSize: settings.maxTableSize,
    rounds: settings.rounds,
    advancePerTable: settings.advancePerTable,
    fillWithBots: settings.fillWithBots,
    botDifficulty: settings.botDifficulty,
    rulesetConfig: settings.rulesetConfig,
    joinAsEntrant: false,
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

/**
 * Applies a change and keeps dependent fields consistent: numbers stay in their domain ranges and
 * the knockout advance count stays below the table size.
 */
export function updateFormState(state: TournamentFormState, patch: Partial<TournamentFormState>): TournamentFormState {
  const next = { ...state, ...patch };
  next.maxEntrants = clamp(next.maxEntrants, TOURNAMENT_LIMITS.MAX_ENTRANTS_LOWER_BOUND, TOURNAMENT_LIMITS.MAX_ENTRANTS);
  next.maxTableSize = clamp(next.maxTableSize, TOURNAMENT_LIMITS.MIN_TABLE_SIZE, TOURNAMENT_LIMITS.MAX_TABLE_SIZE);
  next.rounds = clamp(next.rounds, TOURNAMENT_LIMITS.MIN_ROUNDS, TOURNAMENT_LIMITS.MAX_ROUNDS);
  if (next.advancePerTable !== null && next.advancePerTable >= next.maxTableSize) next.advancePerTable = null;
  return next;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Invalid value.';
}

function check(errors: TournamentFormErrors, field: TournamentFormField, run: () => unknown): void {
  try {
    run();
  } catch (error) {
    errors[field] = messageOf(error);
  }
}

/**
 * Field errors of the form; empty when the server will accept it. `startsAtChanged`: on edit an
 * untouched start time is not re-validated (the server only checks fields that are sent).
 */
export function validateTournamentForm(state: TournamentFormState, now: number, { startsAtChanged = true } = {}): TournamentFormErrors {
  const errors: TournamentFormErrors = {};
  check(errors, 'name', () => sanitizeTournamentName(state.name));
  check(errors, 'description', () => sanitizeTournamentDescription(state.description));
  if (state.scheduled && startsAtChanged) {
    const startsAt = fromLocalDateTimeInput(state.startsAtLocal);
    if (startsAt === null) errors.startsAt = 'Pick a date and time.';
    else check(errors, 'startsAt', () => parseStartsAt(startsAt, now));
  }
  const problem = getTournamentFormat(state.format).validateSettings(formSettings(state));
  if (problem) errors.settings = problem;
  return errors;
}

export function hasFormErrors(errors: TournamentFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

function startsAtOf(state: TournamentFormState): number | null {
  return state.scheduled ? fromLocalDateTimeInput(state.startsAtLocal) : null;
}

/** POST /api/tournaments body. */
export function toCreateInput(state: TournamentFormState): TournamentDraftInput {
  return {
    name: state.name,
    description: state.description,
    format: state.format,
    visibility: state.visibility,
    startsAt: startsAtOf(state),
    settings: formSettings(state),
    joinAsEntrant: state.joinAsEntrant,
  };
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** PATCH body: only what differs from `original` (null when nothing changed). */
export function toChangesInput(state: TournamentFormState, original: TournamentFormState): TournamentChangesInput | null {
  const changes: TournamentChangesInput = {};
  if (state.name !== original.name) changes.name = state.name;
  if (state.description !== original.description) changes.description = state.description;
  if (state.format !== original.format) changes.format = state.format;
  if (state.visibility !== original.visibility) changes.visibility = state.visibility;
  if (startsAtOf(state) !== startsAtOf(original)) changes.startsAt = startsAtOf(state);
  if (!sameJson(formSettings(state), formSettings(original))) changes.settings = formSettings(state);
  return Object.keys(changes).length === 0 ? null : changes;
}

/** On edit: whether the start time differs from the stored one (and so must be re-validated). */
export function startsAtChanged(state: TournamentFormState, original: TournamentFormState): boolean {
  return startsAtOf(state) !== startsAtOf(original);
}
