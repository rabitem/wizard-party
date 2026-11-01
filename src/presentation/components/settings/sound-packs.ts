import type { GameSettings } from './settings-persistence';

/** The three sound choices a pack sets together. */
export type SoundPackSounds = Pick<GameSettings, 'wizardSound' | 'jesterSound' | 'trickWinSound'>;

export interface SoundPack {
  id: string;
  label: string;
  icon: string;
  sounds: SoundPackSounds;
}

/**
 * Curated sets for the in-game panel: one tap changes the Wizard, Jester and trick-win sound
 * together. Single sounds are picked in Preferences.
 */
export const SOUND_PACKS: readonly SoundPack[] = [
  { id: 'surprise', label: 'Surprise', icon: '🎲', sounds: { wizardSound: 'random', jesterSound: 'random', trickWinSound: 'random' } },
  { id: 'royal', label: 'Royal', icon: '👑', sounds: { wizardSound: 'wizardFanfare', jesterSound: 'jesterHeavyHit', trickWinSound: 'trickWinGlory' } },
  { id: 'arcane', label: 'Arcane', icon: '✨', sounds: { wizardSound: 'wizardMagicSparkle', jesterSound: 'jesterWhomp', trickWinSound: 'trickWinTada' } },
  { id: 'party', label: 'Party', icon: '🎉', sounds: { wizardSound: 'wizardPartyHorn', jesterSound: 'jesterClownHorn', trickWinSound: 'trickWinAirhorn' } },
  { id: 'meme', label: 'Meme', icon: '💀', sounds: { wizardSound: 'wizardOof', jesterSound: 'jesterBonk', trickWinSound: 'trickWinOof' } },
  { id: 'arcade', label: 'Arcade', icon: '🕹️', sounds: { wizardSound: 'wizardLevelUp', jesterSound: 'jesterGameOver', trickWinSound: 'trickWinCoin' } },
  { id: 'drama', label: 'Drama', icon: '😱', sounds: { wizardSound: 'wizardDramaticSting', jesterSound: 'jesterSadViolin', trickWinSound: 'trickWinChoir' } },
];

/** The pack the current choices match, or null for a player's own mix. */
export function findSoundPack(settings: SoundPackSounds): SoundPack | null {
  return SOUND_PACKS.find(({ sounds }) =>
    sounds.wizardSound === settings.wizardSound
    && sounds.jesterSound === settings.jesterSound
    && sounds.trickWinSound === settings.trickWinSound
  ) ?? null;
}
