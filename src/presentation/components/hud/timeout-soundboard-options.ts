import {
  SOUNDBOARD_SOUND_NAMES,
  resolveLegacySoundName,
  type CustomSound,
  type SharedCustomSound,
  type SoundboardSoundName,
} from '@shared/domain';

export interface TimeoutSoundboardOption {
  id: string;
  label: string;
  group: 'Wizard' | 'Jester' | 'Trick' | 'Round' | 'Game' | 'Custom';
  soundName?: SoundboardSoundName;
  customAudio?: CustomSound;
  ownerName?: string;
}

const LABEL_OVERRIDES: Partial<Record<SoundboardSoundName, string>> = {
  wizardAhh: 'Scream',
  wizardUhOh: 'Uh-oh',
  jesterQuack: 'Rubber Duck',
  jesterBoing: 'Cartoon Boing',
  trickWinDrumroll: 'Drum Roll',
  gameWinChampion: 'Champion',
};

function getSoundGroup(id: SoundboardSoundName): TimeoutSoundboardOption['group'] {
  if (id.startsWith('wizard')) return 'Wizard';
  if (id.startsWith('jester')) return 'Jester';
  if (id.startsWith('trickWin')) return 'Trick';
  if (id.startsWith('roundWin')) return 'Round';
  return 'Game';
}

function stripSoundPrefix(id: SoundboardSoundName): string {
  return id
    .replace(/^wizard/, '')
    .replace(/^jester/, '')
    .replace(/^trickWin/, '')
    .replace(/^roundWin/, '')
    .replace(/^gameWin/, '');
}

function formatSoundLabel(id: SoundboardSoundName): string {
  const override = LABEL_OVERRIDES[id];
  if (override) return override;

  return stripSoundPrefix(id)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
}

const PRESET_OPTION_PREFIX = 'preset:';

/** Saved pins and ordering may name a retired preset sound; this points them at its successor. */
export function resolveLegacySoundboardOptionId(id: string): string {
  if (!id.startsWith(PRESET_OPTION_PREFIX)) return id;
  return `${PRESET_OPTION_PREFIX}${resolveLegacySoundName(id.slice(PRESET_OPTION_PREFIX.length))}`;
}

export const TIMEOUT_SOUNDBOARD_OPTIONS: TimeoutSoundboardOption[] =
  SOUNDBOARD_SOUND_NAMES.map((id) => ({
    id: `${PRESET_OPTION_PREFIX}${id}`,
    label: formatSoundLabel(id),
    group: getSoundGroup(id),
    soundName: id,
  }));

function getCustomOptionId(ownerId: string, soundId: string): string {
  return `custom:${ownerId}:${soundId}`;
}

function createCustomOption(audio: CustomSound, ownerId: string, ownerName?: string): TimeoutSoundboardOption {
  return {
    id: getCustomOptionId(ownerId, audio.id),
    label: audio.name,
    group: 'Custom',
    customAudio: audio,
    ownerName,
  };
}

export function buildTimeoutSoundboardOptions({
  localSounds,
  sharedSounds,
  localPlayerId,
}: {
  localSounds: CustomSound[];
  sharedSounds: SharedCustomSound[];
  localPlayerId: string;
}): TimeoutSoundboardOption[] {
  const options = [...TIMEOUT_SOUNDBOARD_OPTIONS];
  const customOptionIds = new Set<string>();

  for (const sound of localSounds) {
    if (!sound.roles.afk) continue;
    const option = createCustomOption(sound, localPlayerId);
    customOptionIds.add(option.id);
    options.push(option);
  }

  for (const sound of sharedSounds) {
    if (!sound.roles.afk) continue;
    const option = createCustomOption(sound, sound.ownerId, sound.ownerName);
    if (customOptionIds.has(option.id)) continue;
    customOptionIds.add(option.id);
    options.push(option);
  }

  return options;
}

export function getTimeoutSoundCommand(option: TimeoutSoundboardOption): string | { customAudio: CustomSound } {
  if (option.customAudio) return { customAudio: option.customAudio };
  return option.soundName ?? '';
}
