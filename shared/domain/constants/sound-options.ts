export const WIZARD_SOUND_NAMES = [
  'wizardBassDrop',
  'wizardPartyHorn',
  'wizardAirhorn',
  'wizardOof',
  'wizardWow',
  'wizardHonk',
  'wizardFart',
  'wizardMagicSparkle',
  'wizardLevelUp',
  'wizardPowerUp',
  'wizardTrumpetCall',
  'wizardDramaticSting',
  'wizardWhoosh',
  'wizardAhh',
  'wizardUhOh',
  'wizardExplosion',
  'wizardFanfare',
] as const;

export const JESTER_SOUND_NAMES = [
  'jesterSadTrombone',
  'jesterBonk',
  'jesterSlip',
  'jesterWhomp',
  'jesterSadViolin',
  'jesterClownHorn',
  'jesterGameOver',
  'jesterWrongBuzzer',
  'jesterAwkwardTune',
  'jesterErrorBeep',
  'jesterQuack',
  'jesterBoing',
  'jesterFacepalm',
  'jesterHeavyHit',
  'jesterCrickets',
] as const;

export const TRICK_WIN_SOUND_NAMES = [
  'trickWinFanfare',
  'trickWinAirhorn',
  'trickWinBassDrop',
  'trickWinOof',
  'trickWinEvilLaugh',
  'trickWinCashRegister',
  'trickWinTada',
  'trickWinSadTrombone',
  'trickWinChoir',
  'trickWinGlory',
  'trickWinCoin',
  'trickWinBoom',
  'trickWinJackpot',
  'trickWinDrumroll',
] as const;

export const ROUND_WIN_SOUND_NAMES = [
  'roundWinApplause',
  'roundWinCheer',
] as const;

export const GAME_WIN_SOUND_NAMES = [
  'gameWinChampion',
  'gameWinTriumph',
] as const;

export const SOUNDBOARD_SOUND_NAMES = [
  ...WIZARD_SOUND_NAMES,
  ...JESTER_SOUND_NAMES,
  ...TRICK_WIN_SOUND_NAMES,
  ...ROUND_WIN_SOUND_NAMES,
  ...GAME_WIN_SOUND_NAMES,
] as const;

export type WizardSoundName = (typeof WIZARD_SOUND_NAMES)[number];
export type JesterSoundName = (typeof JESTER_SOUND_NAMES)[number];
export type TrickWinSoundName = (typeof TRICK_WIN_SOUND_NAMES)[number];
export type RoundWinSoundName = (typeof ROUND_WIN_SOUND_NAMES)[number];
export type GameWinSoundName = (typeof GAME_WIN_SOUND_NAMES)[number];
export type SoundboardSoundName = (typeof SOUNDBOARD_SOUND_NAMES)[number];

export type SpecialCardSoundName = WizardSoundName | JesterSoundName;
export type WinSoundName = TrickWinSoundName | RoundWinSoundName | GameWinSoundName;

/**
 * Ids retired when the bundled clips were replaced with generated ones, mapped to the sound that
 * took their place (always in the same group). Saved settings, synced account documents and
 * clients still running an older build can carry them.
 */
const LEGACY_SOUND_NAMES: Readonly<Record<string, SoundboardSoundName>> = {
  ...({
    wizardVineBoom: 'wizardBassDrop',
    wizard069: 'wizardBassDrop',
    wizardBruh: 'wizardOof',
    wizardEpicSax: 'wizardTrumpetCall',
    wizardJohnCena: 'wizardTrumpetCall',
    wizardNani: 'wizardDramaticSting',
    wizardWilhelmScream: 'wizardAhh',
    wizardYeet: 'wizardWhoosh',
    wizardOhNo: 'wizardUhOh',
    wizardWowCongratz: 'wizardMagicSparkle',
  } satisfies Record<string, WizardSoundName>),
  ...({
    jesterWasted: 'jesterGameOver',
    jesterPriceIsWrong: 'jesterWrongBuzzer',
    jesterWrongPrice: 'jesterWrongBuzzer',
    jesterCurb: 'jesterAwkwardTune',
    jesterWindowsError: 'jesterErrorBeep',
    jesterWindowsXpError: 'jesterErrorBeep',
    jesterOhMyGod: 'jesterWhomp',
    jesterBrutal: 'jesterHeavyHit',
  } satisfies Record<string, JesterSoundName>),
  ...({
    trickWinVineBoom: 'trickWinBassDrop',
    trickWinBruh: 'trickWinOof',
    trickWinHallelujah: 'trickWinChoir',
    trickWinYes: 'trickWinTada',
    trickWinYesYesYes: 'trickWinDrumroll',
    trickWinPoggers: 'trickWinAirhorn',
    trickWinOhYeah: 'trickWinGlory',
    trickWinNice: 'trickWinCoin',
    trickWinEz: 'trickWinCoin',
    trickWinWin: 'trickWinJackpot',
    trickWinWinners: 'trickWinJackpot',
  } satisfies Record<string, TrickWinSoundName>),
  ...({
    gameWinFlawless: 'gameWinTriumph',
  } satisfies Record<string, GameWinSoundName>),
};

/** Replaces a retired sound id with its successor; every other value passes through unchanged. */
export function resolveLegacySoundName<T>(value: T): T | SoundboardSoundName {
  if (typeof value !== 'string' || !Object.prototype.hasOwnProperty.call(LEGACY_SOUND_NAMES, value)) return value;
  return LEGACY_SOUND_NAMES[value];
}

export const CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const CUSTOM_AUDIO_MAX_FILE_SIZE_MB = 2;
export const CUSTOM_AUDIO_MAX_DURATION_SECONDS = 10;
export const CUSTOM_AUDIO_MIN_DURATION_SECONDS = 0.1;

export type CustomSoundRole = 'wizard' | 'jester' | 'trick' | 'afk' | 'shared';

export const SOUND_CATEGORY_IDS = [
  'classic',
  'meme',
  'magic',
  'impact',
  'music',
  'brass',
  'sports',
  'football',
  'political',
  'custom',
] as const;

export type SoundCategory = (typeof SOUND_CATEGORY_IDS)[number];

export const DEFAULT_CUSTOM_SOUND_CATEGORY: SoundCategory = 'custom';

export interface CustomSoundAssignments {
  wizard: boolean;
  jester: boolean;
  trick: boolean;
  afk: boolean;
  shared: boolean;
}

export interface CustomTrickWinAudio {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
  duration: number;
  category?: SoundCategory;
}

export interface CustomSound extends CustomTrickWinAudio {
  category: SoundCategory;
  roles: CustomSoundAssignments;
}

export interface SharedCustomSound extends CustomSound {
  ownerId: string;
  ownerName: string;
}
