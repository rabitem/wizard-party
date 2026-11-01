// Sound presets for wizard, jester, and trick win sounds
import type { SoundCategory } from '@shared/domain';
import type {
  WizardSoundPreference,
  JesterSoundPreference,
  TrickWinSoundPreference,
} from './settings-persistence';

export interface SoundPreset<T extends string> {
  id: T;
  label: string;
  icon: string;
  description: string;
  category?: SoundCategory;
}

export const SOUND_CATEGORY_LABELS: Record<SoundCategory, string> = {
  classic: 'Classic',
  meme: 'Meme',
  magic: 'Magic',
  impact: 'Impact',
  music: 'Music',
  brass: 'Brass',
  sports: 'Sports',
  football: 'Football',
  political: 'Political',
  custom: 'Custom',
};

export function getSoundPresetCategory(preset: Pick<SoundPreset<string>, 'category'>): SoundCategory {
  return preset.category ?? 'classic';
}

export const WIZARD_SOUND_PRESETS: SoundPreset<WizardSoundPreference>[] = [
  { id: 'random', label: 'Random', icon: '🎲', description: 'Different sound each time' },
  { id: 'wizardBassDrop', label: 'Bass Drop', icon: '💥', description: 'Deep boom' },
  { id: 'wizardPartyHorn', label: 'Party Horn', icon: '🎉', description: 'Celebration!' },
  { id: 'wizardAirhorn', label: 'Airhorn', icon: '📯', description: 'Three loud blasts' },
  { id: 'wizardOof', label: 'Oof', icon: '💀', description: 'Big oof' },
  { id: 'wizardWow', label: 'Wow', icon: '😮', description: 'Impressed' },
  { id: 'wizardHonk', label: 'Honk', icon: '🦆', description: 'Goose energy' },
  { id: 'wizardFart', label: 'Toot', icon: '💨', description: 'Comedy gold' },
  { id: 'wizardMagicSparkle', label: 'Magic Sparkle', icon: '✨', description: 'Magical shimmer' },
  { id: 'wizardLevelUp', label: 'Level Up', icon: '⬆️', description: 'RPG power up' },
  { id: 'wizardPowerUp', label: 'Power Up', icon: '⚡', description: 'Game power up' },
  { id: 'wizardTrumpetCall', label: 'Trumpet Call', icon: '🎺', description: 'Make way!' },
  { id: 'wizardDramaticSting', label: 'Dramatic Sting', icon: '😱', description: 'Shock reveal' },
  { id: 'wizardWhoosh', label: 'Whoosh', icon: '🚀', description: 'Fast swoosh' },
  { id: 'wizardAhh', label: 'Scream', icon: '🗣️', description: 'Dramatic ahh' },
  { id: 'wizardUhOh', label: 'Uh-oh', icon: '🙈', description: 'Trouble ahead' },
  { id: 'wizardExplosion', label: 'Explosion', icon: '💣', description: 'Big boom' },
  { id: 'wizardFanfare', label: 'Royal Fanfare', icon: '👑', description: 'Royal entrance' },
];

export const JESTER_SOUND_PRESETS: SoundPreset<JesterSoundPreference>[] = [
  { id: 'random', label: 'Random', icon: '🎲', description: 'Different sound each time' },
  { id: 'jesterSadTrombone', label: 'Sad Trombone', icon: '🎺', description: 'Wah wah waaah' },
  { id: 'jesterBonk', label: 'Bonk', icon: '🔨', description: 'Cartoon bonk' },
  { id: 'jesterSlip', label: 'Slip', icon: '🍌', description: 'Banana peel' },
  { id: 'jesterWhomp', label: 'Whomp', icon: '📉', description: 'Disappointment' },
  { id: 'jesterSadViolin', label: 'Sad Violin', icon: '🎻', description: 'Tragic moment' },
  { id: 'jesterClownHorn', label: 'Clown Horn', icon: '🤡', description: 'Circus vibes' },
  { id: 'jesterGameOver', label: 'Game Over', icon: '☠️', description: 'Out of lives' },
  { id: 'jesterWrongBuzzer', label: 'Wrong!', icon: '❌', description: 'Game show buzzer' },
  { id: 'jesterAwkwardTune', label: 'Awkward Tune', icon: '🎵', description: 'Awkward moment' },
  { id: 'jesterErrorBeep', label: 'Error', icon: '💻', description: 'Computer says no' },
  { id: 'jesterQuack', label: 'Quack', icon: '🦆', description: 'Rubber duck' },
  { id: 'jesterBoing', label: 'Boing', icon: '🌀', description: 'Spring sound' },
  { id: 'jesterFacepalm', label: 'Facepalm', icon: '🤦', description: 'Slap sound' },
  { id: 'jesterHeavyHit', label: 'Heavy Hit', icon: '⚔️', description: 'Crushing blow' },
  { id: 'jesterCrickets', label: 'Crickets', icon: '🦗', description: 'Awkward silence' },
];

export const TRICK_WIN_SOUND_PRESETS: SoundPreset<TrickWinSoundPreference>[] = [
  { id: 'random', label: 'Random', icon: '🎲', description: 'Different sound each time' },
  { id: 'trickWinFanfare', label: 'Fanfare', icon: '🎺', description: 'Victory fanfare' },
  { id: 'trickWinAirhorn', label: 'Airhorn', icon: '📯', description: 'Loud victory' },
  { id: 'trickWinBassDrop', label: 'Bass Drop', icon: '💥', description: 'Dramatic win' },
  { id: 'trickWinOof', label: 'Oof', icon: '💀', description: 'Rub it in' },
  { id: 'trickWinEvilLaugh', label: 'Evil Laugh', icon: '😈', description: 'Villainous' },
  { id: 'trickWinCashRegister', label: 'Ka-ching', icon: '💰', description: 'Money money' },
  { id: 'trickWinTada', label: 'Ta-da!', icon: '✨', description: 'Magic moment' },
  { id: 'trickWinSadTrombone', label: 'Sad Trombone', icon: '🎺', description: 'Ironic win' },
  { id: 'trickWinChoir', label: 'Choir', icon: '🙏', description: 'Heavenly chord' },
  { id: 'trickWinGlory', label: 'Glory Horn', icon: '📯', description: 'Epic glory' },
  { id: 'trickWinCoin', label: 'Coin', icon: '🪙', description: 'Bright ping' },
  { id: 'trickWinBoom', label: 'Explosion', icon: '💥', description: 'Big explosion' },
  { id: 'trickWinJackpot', label: 'Jackpot', icon: '🎰', description: 'Slot machine win' },
  { id: 'trickWinDrumroll', label: 'Drum Roll', icon: '🥁', description: 'Roll and crash' },
];
