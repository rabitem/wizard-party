import {
  CUSTOM_AUDIO_MAX_DURATION_SECONDS,
  CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES,
  CUSTOM_AUDIO_MIN_DURATION_SECONDS,
  DEFAULT_CUSTOM_SOUND_CATEGORY,
  SOUND_CATEGORY_IDS,
  type CustomSound,
  type CustomSoundAssignments,
  type CustomSoundRole,
  type CustomTrickWinAudio,
  type SoundCategory,
} from '@shared/domain';

/** Validation of the custom sounds held in the settings blob (untrusted: any app version wrote it). */

const SOUND_CATEGORIES = new Set<string>(SOUND_CATEGORY_IDS);

const EMPTY_CUSTOM_AUDIO_ROLES: CustomSoundAssignments = {
  wizard: false,
  jester: false,
  trick: false,
  afk: false,
  shared: false,
};

function isValidCustomAudioSize(value: unknown): value is number {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES;
}

function isValidCustomAudioDuration(value: unknown): value is number {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= CUSTOM_AUDIO_MIN_DURATION_SECONDS &&
    value <= CUSTOM_AUDIO_MAX_DURATION_SECONDS;
}

function customAudioBaseSetting(value: unknown): CustomTrickWinAudio | null {
  if (!value || typeof value !== 'object') return null;
  const audio = value as Partial<Record<keyof CustomTrickWinAudio, unknown>>;
  const trimmedName = typeof audio.name === 'string' ? audio.name.trim() : '';
  if (typeof audio.id !== 'string') return null;
  if (trimmedName.length === 0) return null;
  // A sound whose audio is in the device library but not loaded yet has no dataUrl: it is left
  // out here and kept in storage by toStoredSettings (custom-sound-audio-coordinator.ts).
  if (typeof audio.dataUrl !== 'string' || !audio.dataUrl.startsWith('data:audio/')) return null;
  if (!isValidCustomAudioSize(audio.size)) return null;
  if (!isValidCustomAudioDuration(audio.duration)) return null;

  return {
    id: audio.id,
    name: trimmedName,
    dataUrl: audio.dataUrl,
    size: audio.size,
    duration: audio.duration,
  };
}

function customAudioRolesSetting(value: unknown): CustomSoundAssignments {
  if (!value || typeof value !== 'object') return { ...EMPTY_CUSTOM_AUDIO_ROLES };
  const roles = value as Partial<Record<CustomSoundRole, unknown>>;
  return {
    wizard: roles.wizard === true,
    jester: roles.jester === true,
    trick: roles.trick === true,
    afk: roles.afk === true,
    shared: roles.shared === true,
  };
}

function customAudioCategorySetting(value: unknown): SoundCategory {
  return typeof value === 'string' && SOUND_CATEGORIES.has(value) ? value as SoundCategory : DEFAULT_CUSTOM_SOUND_CATEGORY;
}

function customAudioSetting(value: unknown): CustomSound | null {
  const audio = customAudioBaseSetting(value);
  if (!audio) return null;
  const record = value as { roles?: unknown; category?: unknown };
  return {
    ...audio,
    category: customAudioCategorySetting(record.category),
    roles: customAudioRolesSetting(record.roles),
  };
}

export function customSoundsSetting(value: unknown): CustomSound[] {
  if (!Array.isArray(value)) return [];
  const sounds: CustomSound[] = [];
  const ids = new Set<string>();

  for (const item of value) {
    const audio = customAudioSetting(item);
    if (!audio || ids.has(audio.id)) continue;
    ids.add(audio.id);
    sounds.push(audio);
  }

  return sounds;
}

export function customSoundFromLegacyTrickAudio(value: unknown): CustomSound | null {
  const audio = customAudioBaseSetting(value);
  if (!audio) return null;
  return {
    ...audio,
    category: DEFAULT_CUSTOM_SOUND_CATEGORY,
    roles: { ...EMPTY_CUSTOM_AUDIO_ROLES, trick: true },
  };
}

export function getFirstCustomSoundForRole(customSounds: CustomSound[], role: CustomSoundRole): CustomSound | null {
  return customSounds.find((audio) => audio.roles[role]) ?? null;
}
