import { DEFAULT_CUSTOM_SOUND_CATEGORY, type SoundCategory } from '@shared/domain';

import type { CustomAudioAssignments, CustomAudioRole } from './settings-persistence';

/** Pure edits of the custom sound list made by the Custom Sound Manager. */

export interface CustomAudio {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
  duration: number;
  category: SoundCategory;
  roles: CustomAudioAssignments;
}

export type CustomSoundsChangeReason = 'upload' | 'rename' | 'category' | 'role' | 'remove';

const DEFAULT_CUSTOM_AUDIO_ROLES: CustomAudioAssignments = {
  wizard: false,
  jester: false,
  trick: true,
  afk: false,
  shared: false,
};

function createCustomAudioId(fileName: string): string {
  const safeName = fileName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `custom-${Date.now()}-${safeName || 'sound'}`;
}

function normalizeCustomAudioName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : 'Custom sound';
}

/** A newly uploaded sound with the default category and roles. */
export function createUploadedCustomAudio(
  file: Pick<File, 'name' | 'size'>,
  dataUrl: string,
  duration: number
): CustomAudio {
  return {
    id: createCustomAudioId(file.name),
    name: normalizeCustomAudioName(file.name),
    dataUrl,
    size: file.size,
    duration,
    category: DEFAULT_CUSTOM_SOUND_CATEGORY,
    roles: { ...DEFAULT_CUSTOM_AUDIO_ROLES },
  };
}

export function renameCustomAudio(sounds: CustomAudio[], id: string, name: string): CustomAudio[] {
  return sounds.map((audio) => (
    audio.id === id ? { ...audio, name: normalizeCustomAudioName(name) } : audio
  ));
}

export function setCustomAudioRole(
  sounds: CustomAudio[],
  id: string,
  role: CustomAudioRole,
  enabled: boolean
): CustomAudio[] {
  return sounds.map((audio) => (
    audio.id === id
      ? { ...audio, roles: { ...audio.roles, [role]: enabled } }
      : audio
  ));
}

export function setCustomAudioCategory(
  sounds: CustomAudio[],
  id: string,
  category: SoundCategory
): CustomAudio[] {
  return sounds.map((audio) => (
    audio.id === id ? { ...audio, category } : audio
  ));
}

export function removeCustomAudio(sounds: CustomAudio[], id: string): CustomAudio[] {
  return sounds.filter((audio) => audio.id !== id);
}
