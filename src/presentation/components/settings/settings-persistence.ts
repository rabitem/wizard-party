const SETTINGS_STORAGE_KEY = 'wizard-party-settings';

export interface GameSettings {
  avatar: string;
  cardTheme: string;
  tableTheme: string;
  notificationsEnabled: boolean;
}

const DEFAULT_GAME_SETTINGS: GameSettings = {
  avatar: 'wizard1',
  cardTheme: 'classic',
  tableTheme: 'default',
  notificationsEnabled: true,
};

export function loadGameSettings(): GameSettings {
  if (typeof window === 'undefined') return DEFAULT_GAME_SETTINGS;
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_GAME_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_GAME_SETTINGS;
}

export function saveGameSettings(settings: GameSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}
