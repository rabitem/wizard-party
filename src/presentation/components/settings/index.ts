// Presets and types
export {
  AVATAR_PRESETS,
  CARD_THEMES,
  TABLE_THEMES,
  CARD_NUMBER_SIZE_PRESETS,
  THEME_PRESETS,
  WIZARD_SOUND_PRESETS,
  JESTER_SOUND_PRESETS,
  TRICK_WIN_SOUND_PRESETS,
  type AvatarPreset,
  type CardTheme,
  type SuitTheme,
  type TableTheme,
  type CardNumberSizePreset,
  type ThemePreset,
  type SoundPreset,
} from './settings-presets';

// Persistence
export {
  loadGameSettings,
  saveGameSettings,
  getCustomSoundsForRole,
  getRandomCustomSoundForRole,
  getImportedSharedSoundId,
  importSharedSoundAsCustom,
  isSharedSoundImported,
  storeCustomSoundAudio,
  whenCustomSoundsReadable,
  type GameSettings,
  type CardNumberSize,
  type ThemePreference,
  type CustomAudioSettings,
  type CustomAudioRole,
  type CustomAudioAssignments,
  type LeaderboardPosition,
  type CollectionAnimationMode,
} from './settings-persistence';

// Theme packs (seasonal + trend)
export {
  SEASONAL_THEME_PACKS,
  TREND_THEME_PACKS,
  THEME_PACKS,
  applySeasonalThemePack,
  isSeasonalThemePackActive,
  isSeasonalPromoRunning,
  type SeasonalThemePack,
  type ThemePack,
} from './seasonal-theme-packs';

// UI sections
export { SoundSection } from './SoundSection';
export { NotificationsSection } from './NotificationsSection';
export { AvatarSection } from './AvatarSection';
export { CardThemeSection } from './CardThemeSection';
export { CardNumberSizeSection } from './CardNumberSizeSection';
export { TableThemeSection } from './TableThemeSection';
export { KeyboardShortcutsSection } from './KeyboardShortcutsSection';
export { ThemeSection } from './ThemeSection';
export { SeasonalPackSection } from './SeasonalPackSection';
export { AudioUploadSection, type CustomAudio, type CustomSoundsChangeReason, type AudioValidationResult } from './AudioUploadSection';
export { RulesetSection } from './RulesetSection';
export { ExpansionsSection } from './expansions';
export { MedievalToggle } from './MedievalToggle';
export { LeaderboardSection } from './LeaderboardSection';
export { CollectionAnimationSection } from './CollectionAnimationSection';
export {
  CARD_BACK_DESIGNS,
  DEFAULT_CARD_BACK,
  SEASONAL_CARD_STYLES,
  getCardBackDesign,
  getSeasonalCardStyle,
} from './card-back-presets';
export type { CardBackDesign, CardBackPalette, CardBackStyle, SeasonalCardStyle } from './card-back-presets';
export { useSeasonalPack } from './useSeasonalPack';
