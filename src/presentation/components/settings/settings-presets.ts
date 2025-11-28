// Avatar presets
export interface AvatarPreset {
  id: string;
  emoji: string;
  label: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'wizard1', emoji: '🧙‍♂️', label: 'Wizard' },
  { id: 'wizard2', emoji: '🧙‍♀️', label: 'Sorceress' },
  { id: 'mage', emoji: '🔮', label: 'Mage' },
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'moon', emoji: '🌙', label: 'Moon' },
  { id: 'sun', emoji: '☀️', label: 'Sun' },
  { id: 'dragon', emoji: '🐉', label: 'Dragon' },
  { id: 'owl', emoji: '🦉', label: 'Owl' },
  { id: 'cat', emoji: '🐱', label: 'Cat' },
  { id: 'wolf', emoji: '🐺', label: 'Wolf' },
  { id: 'crown', emoji: '👑', label: 'Royal' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
];

// Card themes
export interface CardTheme {
  id: string;
  name: string;
  colors: { primary: string; secondary: string };
}

export const CARD_THEMES: CardTheme[] = [
  { id: 'classic', name: 'Classic', colors: { primary: '#8b5cf6', secondary: '#6366f1' } },
  { id: 'royal', name: 'Royal Gold', colors: { primary: '#f59e0b', secondary: '#d97706' } },
  { id: 'nature', name: 'Forest', colors: { primary: '#22c55e', secondary: '#16a34a' } },
  { id: 'ocean', name: 'Ocean', colors: { primary: '#0ea5e9', secondary: '#0284c7' } },
  { id: 'dark', name: 'Shadow', colors: { primary: '#6b7280', secondary: '#4b5563' } },
  { id: 'fire', name: 'Inferno', colors: { primary: '#ef4444', secondary: '#dc2626' } },
];

// Table themes
export interface TableTheme {
  id: string;
  name: string;
  bg: string;
}

export const TABLE_THEMES: TableTheme[] = [
  { id: 'default', name: 'Mystical Purple', bg: 'from-purple-950 via-indigo-950 to-slate-950' },
  { id: 'forest', name: 'Enchanted Forest', bg: 'from-emerald-950 via-green-950 to-slate-950' },
  { id: 'ocean', name: 'Deep Ocean', bg: 'from-blue-950 via-cyan-950 to-slate-950' },
  { id: 'fire', name: "Dragon's Lair", bg: 'from-red-950 via-orange-950 to-slate-950' },
  { id: 'dark', name: 'Void', bg: 'from-zinc-950 via-neutral-950 to-black' },
  { id: 'gold', name: 'Royal Chamber', bg: 'from-amber-950 via-yellow-950 to-slate-950' },
];
