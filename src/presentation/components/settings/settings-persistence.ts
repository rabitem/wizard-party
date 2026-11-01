import {
  JESTER_SOUND_NAMES,
  TRICK_WIN_SOUND_NAMES,
  WIZARD_SOUND_NAMES,
  DEFAULT_CUSTOM_SOUND_CATEGORY,
  resolveLegacySoundName,
  type CustomSound,
  type CustomSoundRole,
  type CustomSoundAssignments,
  type JesterSoundName,
  type SharedCustomSound,
  type TrickWinSoundName,
  type WizardSoundName,
} from '@shared/domain';
import { exceedsCustomSoundLibraryCap } from '@/lib/sound/custom-sound-library.config';
import { customSoundAudioLibrary } from '@/lib/sound/custom-sound-audio-library';
import { safeLocalStorage } from '@/lib/storage';
import { CONSTANTS } from '@/presentation/config/constants';
import { isSandboxRoute } from '@/presentation/utils/sandbox-route';
import type { LeaderboardPosition } from '@/presentation/types/hud-layout.types';
import {
  COLLECTION_ANIMATION_MODE_IDS,
  type CollectionAnimationMode,
} from '@/presentation/config/collection-animation.config';
import { AVATAR_PRESETS } from './avatar-presets';
import { CARD_THEMES } from './card-theme-presets';
import { CustomSoundAudioCoordinator } from './custom-sound-audio-coordinator';
import { customSoundFromLegacyTrickAudio, customSoundsSetting, getFirstCustomSoundForRole } from './custom-sound-settings';
import { TABLE_THEMES } from './visual-presets';

export type CardNumberSize = 'small' | 'medium' | 'large';

// Theme preference for visual appearance. The one list of UI theme ids: THEME_PRESETS must cover
// exactly these, and ThemeProvider derives its `theme-*` classes from THEME_PRESETS.
export const THEME_PREFERENCE_IDS = ['dark', 'light', 'forest', 'royal', 'frost', 'halloween', 'autumn', 'winter',
  'spring', 'summer', 'manga', 'neon', 'pixel', 'celestial', 'solarpunk'] as const;
export type ThemePreference = (typeof THEME_PREFERENCE_IDS)[number];

// Sound preference types - 'random' means pick a random sound each time
export type WizardSoundPreference = 'random' | WizardSoundName;
export type JesterSoundPreference = 'random' | JesterSoundName;
export type TrickWinSoundPreference = 'random' | TrickWinSoundName;
export type { CollectionAnimationMode };

// Custom audio settings for trick win sounds
export type CustomAudioSettings = CustomSound;
export type CustomAudioRole = CustomSoundRole;
export type CustomAudioAssignments = CustomSoundAssignments;

// Leaderboard position preference (single definition in the presentation types)
export type { LeaderboardPosition };

export interface GameSettings {
  avatar: string;
  cardTheme: string;
  tableTheme: string;
  notificationsEnabled: boolean;
  cardNumberSize: CardNumberSize;
  wizardSound: WizardSoundPreference;
  jesterSound: JesterSoundPreference;
  trickWinSound: TrickWinSoundPreference;
  collectionAnimation: CollectionAnimationMode;
  theme: ThemePreference;
  /** Derived (first sound with the trick role); never stored. */
  customTrickWinAudio: CustomAudioSettings | null;
  customSounds: CustomAudioSettings[];
  leaderboardPosition: LeaderboardPosition;
  leaderboardCompact: boolean;
  /** Opponents' characters stand at their seats on the 3D table. */
  tableCharacters: boolean;
}

const DEFAULT_GAME_SETTINGS: GameSettings = {
  avatar: 'wizard',
  cardTheme: 'fantasy',
  tableTheme: 'default',
  notificationsEnabled: true,
  cardNumberSize: 'medium',
  wizardSound: 'random',
  jesterSound: 'random',
  trickWinSound: 'random',
  collectionAnimation: 'random',
  theme: 'dark',
  customTrickWinAudio: null,
  customSounds: [],
  leaderboardPosition: 'right',
  leaderboardCompact: false,
  tableCharacters: true,
};

const AVATAR_IDS = new Set(AVATAR_PRESETS.map((preset) => preset.id));
const CARD_THEME_IDS = new Set(CARD_THEMES.map((theme) => theme.id));
const TABLE_THEME_IDS = new Set(TABLE_THEMES.map((theme) => theme.id));
const CARD_NUMBER_SIZES = new Set<CardNumberSize>(['small', 'medium', 'large']);
const THEME_PREFERENCES = new Set<ThemePreference>(THEME_PREFERENCE_IDS);
const LEADERBOARD_POSITIONS = new Set<LeaderboardPosition>(['hidden', 'left', 'right', 'bottom']);
const WIZARD_SOUND_PREFERENCES = new Set<string>(['random', ...WIZARD_SOUND_NAMES]);
const JESTER_SOUND_PREFERENCES = new Set<string>(['random', ...JESTER_SOUND_NAMES]);
const TRICK_WIN_SOUND_PREFERENCES = new Set<string>(['random', ...TRICK_WIN_SOUND_NAMES]);
const COLLECTION_ANIMATION_PREFERENCES = new Set<string>(COLLECTION_ANIMATION_MODE_IDS);
const SETTINGS_CHANGED_EVENT = 'settings-changed';

function cloneDefaultSettings(): GameSettings {
  return { ...DEFAULT_GAME_SETTINGS, customTrickWinAudio: null, customSounds: [] };
}

function booleanSetting(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function enumSetting<T extends string>(value: unknown, allowed: ReadonlySet<string>, fallback: T): T {
  return typeof value === 'string' && allowed.has(value) ? value as T : fallback;
}

/** Settings saved (or synced to an account) before the sound library changed may name retired sounds. */
function soundSetting<T extends string>(value: unknown, allowed: ReadonlySet<string>, fallback: T): T {
  return enumSetting(resolveLegacySoundName(value), allowed, fallback);
}

function normalizeGameSettings(settings: unknown): GameSettings {
  if (!settings || typeof settings !== 'object') return cloneDefaultSettings();
  const partial = settings as Partial<Record<keyof GameSettings, unknown>>;
  const hasCustomSounds = Object.prototype.hasOwnProperty.call(partial, 'customSounds');
  const customSounds = hasCustomSounds
    ? customSoundsSetting(partial.customSounds)
    : [
        customSoundFromLegacyTrickAudio(partial.customTrickWinAudio),
      ].filter((audio): audio is CustomAudioSettings => Boolean(audio));

  return {
    avatar: enumSetting(partial.avatar, AVATAR_IDS, DEFAULT_GAME_SETTINGS.avatar),
    cardTheme: enumSetting(partial.cardTheme, CARD_THEME_IDS, DEFAULT_GAME_SETTINGS.cardTheme),
    tableTheme: enumSetting(partial.tableTheme, TABLE_THEME_IDS, DEFAULT_GAME_SETTINGS.tableTheme),
    notificationsEnabled: booleanSetting(partial.notificationsEnabled, DEFAULT_GAME_SETTINGS.notificationsEnabled),
    cardNumberSize: enumSetting(partial.cardNumberSize, CARD_NUMBER_SIZES, DEFAULT_GAME_SETTINGS.cardNumberSize),
    wizardSound: soundSetting(partial.wizardSound, WIZARD_SOUND_PREFERENCES, DEFAULT_GAME_SETTINGS.wizardSound),
    jesterSound: soundSetting(partial.jesterSound, JESTER_SOUND_PREFERENCES, DEFAULT_GAME_SETTINGS.jesterSound),
    trickWinSound: soundSetting(partial.trickWinSound, TRICK_WIN_SOUND_PREFERENCES, DEFAULT_GAME_SETTINGS.trickWinSound),
    collectionAnimation: enumSetting(
      partial.collectionAnimation,
      COLLECTION_ANIMATION_PREFERENCES,
      DEFAULT_GAME_SETTINGS.collectionAnimation
    ),
    theme: enumSetting(partial.theme, THEME_PREFERENCES, DEFAULT_GAME_SETTINGS.theme),
    customTrickWinAudio: getFirstCustomSoundForRole(customSounds, 'trick'),
    customSounds,
    leaderboardPosition: enumSetting(
      partial.leaderboardPosition,
      LEADERBOARD_POSITIONS,
      DEFAULT_GAME_SETTINGS.leaderboardPosition
    ),
    leaderboardCompact: booleanSetting(partial.leaderboardCompact, DEFAULT_GAME_SETTINGS.leaderboardCompact),
    tableCharacters: booleanSetting(partial.tableCharacters, DEFAULT_GAME_SETTINGS.tableCharacters),
  };
}

/** The animation sandbox switches themes rapidly, so it keeps its own settings and never touches the player's. */
function settingsStorageKey(): string {
  return isSandboxRoute() ? CONSTANTS.STORAGE_KEYS.SANDBOX_SETTINGS : CONSTANTS.STORAGE_KEYS.SETTINGS;
}

function announceSettings(settings: GameSettings): void {
  // Custom event so components can react to settings changes
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: settings }));
}

/** Custom sound audio lives in IndexedDB; the settings blob holds only its metadata. */
const customSoundAudio = new CustomSoundAudioCoordinator<GameSettings>(customSoundAudioLibrary, {
  read: () => safeLocalStorage.readJson(settingsStorageKey()),
  write: (stored) => void safeLocalStorage.writeJson(settingsStorageKey(), stored),
  readAll: () => [CONSTANTS.STORAGE_KEYS.SETTINGS, CONSTANTS.STORAGE_KEYS.SANDBOX_SETTINGS]
    .map((key) => safeLocalStorage.readJson(key)),
  normalize: normalizeGameSettings,
  // The trick override is derived from customSounds; storing it would store its audio twice.
  serialize: ({ customTrickWinAudio: _derived, ...stored }) => ({ ...stored }),
  announce: announceSettings,
});

export function loadGameSettings(): GameSettings {
  if (typeof window === 'undefined') return cloneDefaultSettings();
  void customSoundAudio.ensureHydrated();
  const saved = safeLocalStorage.readJson(settingsStorageKey());
  return saved ? customSoundAudio.resolve(saved) : cloneDefaultSettings();
}

export function saveGameSettings(settings: GameSettings): GameSettings {
  const normalized = normalizeGameSettings(settings);
  if (typeof window === 'undefined') return normalized;
  const key = settingsStorageKey();
  const previous = safeLocalStorage.readJson(key);
  // Never throws: a write that cannot be persisted (blocked or full storage) is kept in memory for
  // this visit and reported to safeLocalStorage.onWriteFailure / onUnsavedChange listeners.
  safeLocalStorage.writeJson(key, customSoundAudio.toStored(normalized, previous));
  customSoundAudio.afterSave(previous, normalized);
  announceSettings(normalized);
  return normalized;
}

/** Puts a new sound's audio into the device library before it is saved (resolves false if unusable). */
export function storeCustomSoundAudio(id: string, dataUrl: string): Promise<boolean> {
  return customSoundAudio.storeAudio(id, dataUrl);
}

/** Resolves once every saved custom sound is loaded; rejects when some cannot be read here. */
export function whenCustomSoundsReadable(): Promise<void> {
  return customSoundAudio.whenReadable();
}

export function getCustomSoundsForRole(
  settings: Pick<GameSettings, 'customSounds'>,
  role: CustomAudioRole
): CustomAudioSettings[] {
  return settings.customSounds.filter((audio) => audio.roles[role]);
}

export function getRandomCustomSoundForRole(
  settings: Pick<GameSettings, 'customSounds'>,
  role: CustomAudioRole
): CustomAudioSettings | null {
  const sounds = getCustomSoundsForRole(settings, role);
  if (sounds.length === 0) return null;
  return sounds[Math.floor(Math.random() * sounds.length)];
}

export function getImportedSharedSoundId(sound: Pick<SharedCustomSound, 'id' | 'ownerId'>): string {
  return `imported-${sound.ownerId}-${sound.id}`;
}

export function isSharedSoundImported(
  customSounds: CustomAudioSettings[],
  sound: Pick<SharedCustomSound, 'id' | 'ownerId'>
): boolean {
  return customSounds.some((audio) => audio.id === getImportedSharedSoundId(sound));
}

/** Adds a party member's shared sound to this device; unchanged when already imported or over the device cap. */
export function importSharedSoundAsCustom(
  customSounds: CustomAudioSettings[],
  sound: SharedCustomSound
): CustomAudioSettings[] {
  if (isSharedSoundImported(customSounds, sound)) return customSounds;
  if (exceedsCustomSoundLibraryCap(customSounds, sound.size)) return customSounds;

  return [
    ...customSounds,
    {
      id: getImportedSharedSoundId(sound),
      name: sound.name,
      dataUrl: sound.dataUrl,
      size: sound.size,
      duration: sound.duration,
      category: sound.category ?? DEFAULT_CUSTOM_SOUND_CATEGORY,
      roles: {
        wizard: sound.roles.wizard,
        jester: sound.roles.jester,
        trick: sound.roles.trick,
        afk: sound.roles.afk,
        shared: false,
      },
    },
  ];
}
