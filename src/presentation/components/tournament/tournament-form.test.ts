import { describe, expect, it } from 'vitest';

import { TOURNAMENT_LIMITS } from '@shared/domain/tournament';

import {
  fromLocalDateTimeInput,
  hasFormErrors,
  initialFormState,
  startsAtChanged,
  toChangesInput,
  toCreateInput,
  toLocalDateTimeInput,
  updateFormState,
  validateTournamentForm,
} from './tournament-form';

const NOW = new Date(2026, 9, 28, 12, 0).getTime();
const HOUR = 60 * 60 * 1000;

function form(overrides = {}) {
  return { ...initialFormState(NOW), name: 'Spring Cup', ...overrides };
}

describe('tournament form', () => {
  describe('datetime-local conversion', () => {
    it('should round-trip local times', () => {
      const value = toLocalDateTimeInput(NOW + 3 * HOUR);
      expect(value).toBe('2026-10-28T15:00');
      expect(fromLocalDateTimeInput(value)).toBe(NOW + 3 * HOUR);
    });

    it('should reject malformed and overflowing values', () => {
      expect(fromLocalDateTimeInput('')).toBeNull();
      expect(fromLocalDateTimeInput('tomorrow')).toBeNull();
      expect(fromLocalDateTimeInput('2026-02-31T10:00')).toBeNull();
    });
  });

  describe('updateFormState', () => {
    it('should clamp numbers into the domain ranges', () => {
      const next = updateFormState(form(), { maxEntrants: 500, maxTableSize: 1, rounds: 0 });
      expect(next.maxEntrants).toBe(TOURNAMENT_LIMITS.MAX_ENTRANTS);
      expect(next.maxTableSize).toBe(TOURNAMENT_LIMITS.MIN_TABLE_SIZE);
      expect(next.rounds).toBe(TOURNAMENT_LIMITS.MIN_ROUNDS);
    });

    it('should reset the advance count when the table shrinks below it', () => {
      const knockout = updateFormState(form({ format: 'knockout' }), { advancePerTable: 4, maxTableSize: 6 });
      expect(knockout.advancePerTable).toBe(4);
      expect(updateFormState(knockout, { maxTableSize: 4 }).advancePerTable).toBeNull();
    });
  });

  describe('validateTournamentForm', () => {
    it('should accept the defaults with a name', () => {
      expect(hasFormErrors(validateTournamentForm(form(), NOW))).toBe(false);
    });

    it('should report the domain messages per field', () => {
      const errors = validateTournamentForm(form({ name: ' a ', description: 'x'.repeat(TOURNAMENT_LIMITS.DESCRIPTION_MAX_LENGTH + 1) }), NOW);
      expect(errors.name).toMatch(/characters/);
      expect(errors.description).toMatch(/limited/);
    });

    it('should validate a scheduled start only when scheduling is on', () => {
      const past = form({ scheduled: true, startsAtLocal: toLocalDateTimeInput(NOW - HOUR) });
      expect(validateTournamentForm(past, NOW).startsAt).toMatch(/future/);
      expect(validateTournamentForm({ ...past, scheduled: false }, NOW).startsAt).toBeUndefined();
      expect(validateTournamentForm(past, NOW, { startsAtChanged: false }).startsAt).toBeUndefined();
      expect(validateTournamentForm(form({ scheduled: true, startsAtLocal: '' }), NOW).startsAt).toMatch(/pick/i);
    });
  });

  describe('API bodies', () => {
    it('should build the create body with a scheduled start', () => {
      const body = toCreateInput(form({ scheduled: true, startsAtLocal: toLocalDateTimeInput(NOW + 2 * HOUR) }));
      expect(body).toMatchObject({ name: 'Spring Cup', format: 'series', visibility: 'public', startsAt: NOW + 2 * HOUR, joinAsEntrant: true });
      expect(body.settings).toMatchObject({ maxEntrants: TOURNAMENT_LIMITS.DEFAULT_MAX_ENTRANTS, maxTableSize: TOURNAMENT_LIMITS.DEFAULT_MAX_TABLE_SIZE });
      expect(toCreateInput(form()).startsAt).toBeNull();
    });

    it('should send only changed fields on edit', () => {
      const original = form();
      expect(toChangesInput(original, original)).toBeNull();
      const changes = toChangesInput({ ...original, description: 'Bring snacks', maxEntrants: 8 }, original);
      expect(changes).toEqual({ description: 'Bring snacks', settings: expect.objectContaining({ maxEntrants: 8 }) });
      expect(toChangesInput({ ...original, scheduled: true }, original)).toHaveProperty('startsAt');
    });

    it('should tell when the start time changed', () => {
      const original = form({ scheduled: true });
      expect(startsAtChanged(original, original)).toBe(false);
      expect(startsAtChanged({ ...original, scheduled: false }, original)).toBe(true);
    });
  });
});
