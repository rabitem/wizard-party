import { DEFAULT_ROOM_SETTINGS, ensureRoomSettings, type IRulesetConfig } from '@shared/domain';
import type { RoomSettings } from '@/presentation/types';

interface BuildCreateRoomSettingsInput {
  roomId: string;
  roomName: string;
  isPublic: boolean;
  maxPlayers: number;
  rulesetConfig: IRulesetConfig;
}

export function buildCreateRoomSettings({
  roomId,
  roomName,
  isPublic,
  maxPlayers,
  rulesetConfig,
}: BuildCreateRoomSettingsInput): RoomSettings {
  return ensureRoomSettings({
    name: roomName.trim() || roomId,
    isPublic,
    maxPlayers,
    rulesetConfig,
  }, { ...DEFAULT_ROOM_SETTINGS, name: roomId });
}
