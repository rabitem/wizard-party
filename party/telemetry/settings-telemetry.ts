import type { IRoomSettings, IRulesetConfig, SoundPreferences } from '../../shared/domain';
import {
  TELEMETRY_PAYLOAD_LIMITS,
  TelemetryEventType,
  boundedText,
  type TelemetryRoomSettings,
} from '../../shared/telemetry';
import { summarizeSoundPreferences } from './sound-telemetry';
import { telemetryFact, type TelemetryFact } from './telemetry-fact';

/** Settings facts: what changed, by whom, without secrets. */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Structural equality for JSON-like values (settings are plain data). */
function isDeepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => isDeepEqual(item, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((key) => isDeepEqual(a[key], b[key]));
  }
  return false;
}

/** Top-level keys whose values differ, sorted for stable output. */
function changedKeys(previous: object, next: object): string[] {
  const before = previous as Record<string, unknown>;
  const after = next as Record<string, unknown>;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => !isDeepEqual(before[key], after[key])).sort();
}

function sanitizeRoomSettings(settings: IRoomSettings): TelemetryRoomSettings {
  return {
    name: boundedText(settings.name, TELEMETRY_PAYLOAD_LIMITS.MAX_SHORT_TEXT_LENGTH) ?? '',
    isPublic: settings.isPublic,
    maxPlayers: settings.maxPlayers,
    ruleset: settings.rulesetConfig ?? null,
  };
}

/** Null when nothing changed, so no-op updates do not produce facts. */
export function roomSettingsChangedFact(
  playerId: string | null,
  previous: IRoomSettings,
  next: IRoomSettings
): TelemetryFact<typeof TelemetryEventType.ROOM_SETTINGS_CHANGED> | null {
  const keys = changedKeys(previous, next);
  if (keys.length === 0) return null;
  return telemetryFact(TelemetryEventType.ROOM_SETTINGS_CHANGED, playerId, {
    playerId,
    settings: sanitizeRoomSettings(next),
    changedKeys: keys,
  });
}

export function rulesetChangedFact(
  playerId: string | null,
  previous: IRulesetConfig,
  next: IRulesetConfig
): TelemetryFact<typeof TelemetryEventType.RULESET_CHANGED> | null {
  const keys = changedKeys(previous, next);
  if (keys.length === 0) return null;
  return telemetryFact(TelemetryEventType.RULESET_CHANGED, playerId, { playerId, ruleset: next, changedKeys: keys });
}

/** Clients resend unchanged preferences (e.g. on reconnect); only real changes become facts. */
export function soundPreferencesChangedFact(
  playerId: string,
  previous: SoundPreferences,
  next: SoundPreferences
): TelemetryFact<typeof TelemetryEventType.SOUND_PREFERENCES_CHANGED> | null {
  const keys = changedKeys(previous, next);
  if (keys.length === 0) return null;
  const changed = Object.fromEntries(
    keys.map((key) => [key, next[key as keyof SoundPreferences] ?? null])
  ) as SoundPreferences;
  const preferences = summarizeSoundPreferences(changed);
  return telemetryFact(TelemetryEventType.SOUND_PREFERENCES_CHANGED, playerId, {
    playerId,
    preferences,
    changedKeys: keys,
  });
}
