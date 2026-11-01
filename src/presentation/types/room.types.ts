/**
 * Room Types
 * Centralized type definitions for room settings and configuration
 */

import type { IRulesetConfig } from '@shared/domain';

/**
 * Room configuration settings for creating or joining a room
 */
export interface RoomSettings {
  name: string;
  isPublic: boolean;
  maxPlayers: number;
  rulesetConfig?: IRulesetConfig;
}
