// Presets and types
export {
  AVATAR_PRESETS,
  CARD_THEMES,
  TABLE_THEMES,
  type AvatarPreset,
  type CardTheme,
  type TableTheme,
} from './settings-presets';

// Persistence
export { loadGameSettings, saveGameSettings, type GameSettings } from './settings-persistence';

// UI sections
export { SoundSection } from './SoundSection';
export { NotificationsSection } from './NotificationsSection';
export { AvatarSection } from './AvatarSection';
export { CardThemeSection } from './CardThemeSection';
export { TableThemeSection } from './TableThemeSection';
export { KeyboardShortcutsSection } from './KeyboardShortcutsSection';
