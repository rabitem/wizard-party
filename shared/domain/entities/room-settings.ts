/**
 * Room Settings
 *
 * Multiplayer room configuration and its normalization. Settings arrive from
 * clients and storage, so every field is repaired before it can affect a join.
 */

import {
  type IRulesetConfig,
  DEFAULT_RULESET_CONFIG,
  ensureRulesetConfig,
} from '../value-objects/ruleset-config';

/**
 * Room settings for multiplayer configuration
 * Note: IRulesetConfig is imported from value-objects/ruleset-config
 */
export interface IRoomSettings {
  name: string;
  isPublic: boolean;
  maxPlayers: number;
  rulesetConfig?: IRulesetConfig;
}

/**
 * Default room settings
 */
export const DEFAULT_ROOM_SETTINGS: IRoomSettings = {
  name: '',
  isPublic: true,
  maxPlayers: 6,
  rulesetConfig: DEFAULT_RULESET_CONFIG,
};

export const ROOM_PLAYER_LIMITS = {
  MIN: 3,
  MAX: 6,
} as const;

const ROOM_NAME_MAX_LENGTH = 20;

function getObjectProperty(source: unknown, key: string): unknown {
  if (typeof source !== 'object' || source === null) return undefined;
  return (source as Record<string, unknown>)[key];
}

function normalizeRoomName(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, ROOM_NAME_MAX_LENGTH);
}

function normalizeRoomVisibility(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeMaxPlayers(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const wholeValue = Math.trunc(value);
  return Math.min(ROOM_PLAYER_LIMITS.MAX, Math.max(ROOM_PLAYER_LIMITS.MIN, wholeValue));
}

/**
 * Normalize room settings from clients or storage before they affect joins. Only the fields of
 * IRoomSettings are kept: anything else (such as the retired room password that older clients
 * and stored rooms may still carry) is dropped here.
 */
export function ensureRoomSettings(
  settings: unknown,
  fallback: IRoomSettings = DEFAULT_ROOM_SETTINGS
): IRoomSettings {
  const source = typeof settings === 'object' && settings !== null ? settings : {};
  const fallbackRuleset = fallback.rulesetConfig ?? DEFAULT_RULESET_CONFIG;
  const incomingRuleset = getObjectProperty(source, 'rulesetConfig');

  return {
    name: normalizeRoomName(getObjectProperty(source, 'name'), fallback.name),
    isPublic: normalizeRoomVisibility(getObjectProperty(source, 'isPublic'), fallback.isPublic),
    maxPlayers: normalizeMaxPlayers(getObjectProperty(source, 'maxPlayers'), fallback.maxPlayers),
    rulesetConfig: ensureRulesetConfig(incomingRuleset === undefined ? fallbackRuleset : incomingRuleset),
  };
}
