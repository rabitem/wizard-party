// Re-export all presets from their respective modules

// Avatar presets
export { AVATAR_PRESETS, type AvatarPreset } from './avatar-presets';

// Card theme presets
export { CARD_THEMES, type CardTheme, type SuitTheme } from './card-theme-presets';

// Visual presets (table themes, card number sizes, theme presets)
export {
  TABLE_THEMES,
  CARD_NUMBER_SIZE_PRESETS,
  THEME_PRESETS,
  type TableTheme,
  type CardNumberSizePreset,
  type ThemePreset,
} from './visual-presets';

// Sound presets
export {
  WIZARD_SOUND_PRESETS,
  JESTER_SOUND_PRESETS,
  TRICK_WIN_SOUND_PRESETS,
  SOUND_CATEGORY_LABELS,
  getSoundPresetCategory,
  type SoundPreset,
} from './sound-presets';
