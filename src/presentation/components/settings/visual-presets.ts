// Table themes
import { TABLE_THEME_PALETTES } from '@/presentation/config/table-theme.config';
import type { CardNumberSize, ThemePreference } from './settings-persistence';

export interface TableTheme {
  id: string;
  name: string;
  bg: string;
  isNew?: boolean;
}

export const TABLE_THEMES: TableTheme[] = TABLE_THEME_PALETTES.map(({ id, name, bg, isNew }) => ({ id, name, bg, isNew }));

// Card number size presets
export interface CardNumberSizePreset {
  id: CardNumberSize;
  name: string;
  description: string;
  /** Font sizes in pixels */
  fontSizes: {
    center: number;
    centerSymbol: number;
    corner: number;
    cornerSymbol: number;
  };
}

export const CARD_NUMBER_SIZE_PRESETS: CardNumberSizePreset[] = [
  {
    id: 'small',
    name: 'Small',
    description: 'Subtle numbers',
    fontSizes: { center: 130, centerSymbol: 36, corner: 92, cornerSymbol: 48 },
  },
  {
    id: 'medium',
    name: 'Medium',
    description: 'Balanced size',
    fontSizes: { center: 160, centerSymbol: 48, corner: 112, cornerSymbol: 60 },
  },
  {
    id: 'large',
    name: 'Large',
    description: 'Easy to read',
    fontSizes: { center: 190, centerSymbol: 60, corner: 132, cornerSymbol: 72 },
  },
];

// Theme presets for visual appearance
export interface ThemePreset {
  id: ThemePreference;
  name: string;
  description: string;
  icon: string; // RPG-Awesome icon class
  /** Highlighted with a "New" badge in settings */
  isNew?: boolean;
  colors: {
    background: string;
    primary: string;
    accent: string;
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'dark',
    name: 'Dark',
    description: 'Medieval amber & gold',
    icon: 'ra-moon-sun',
    colors: {
      background: '#0a0908',
      primary: '#d4a853',
      accent: '#1a1510',
    },
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Parchment & cream',
    icon: 'ra-sun',
    colors: {
      background: '#f5f0e6',
      primary: '#b8860b',
      accent: '#ffffff',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Enchanted grove',
    icon: 'ra-pine-tree',
    colors: {
      background: '#0d1210',
      primary: '#4d9b5d',
      accent: '#14201a',
    },
  },
  {
    id: 'royal',
    name: 'Royal',
    description: 'Purple magic',
    icon: 'ra-crown',
    colors: {
      background: '#0e0a14',
      primary: '#9b6dd4',
      accent: '#18101e',
    },
  },
  {
    id: 'frost',
    name: 'Frost',
    description: 'Ice & winter',
    icon: 'ra-snowflake',
    colors: {
      background: '#080a0e',
      primary: '#5da8d4',
      accent: '#101518',
    },
  },
  {
    id: 'halloween',
    name: 'Halloween',
    description: 'Pumpkins & shadows',
    icon: 'ra-death-skull',
    isNew: true,
    colors: {
      background: '#0c0810',
      primary: '#ff7a1a',
      accent: '#170f1c',
    },
  },
  {
    id: 'autumn',
    name: 'Autumn',
    description: 'Falling leaves & harvest',
    icon: 'ra-zigzag-leaf',
    isNew: true,
    colors: {
      background: 'color-mix(in srgb, var(--surface), black 31%)',
      primary: '#d9752b',
      accent: '#1e140c',
    },
  },
  {
    id: 'winter',
    name: 'Winter',
    description: 'Snowy silver & hearth glow',
    icon: 'ra-campfire',
    isNew: true,
    colors: {
      background: '#eef1f5',
      primary: '#c2410c',
      accent: '#ffffff',
    },
  },
  {
    id: 'spring',
    name: 'Spring',
    description: 'Blossoms & fresh shoots',
    icon: 'ra-flower',
    isNew: true,
    colors: {
      background: '#0e100c',
      primary: '#e58bb0',
      accent: '#171c13',
    },
  },
  {
    id: 'summer',
    name: 'Summer',
    description: 'Sun, sea & long evenings',
    icon: 'ra-sun',
    isNew: true,
    colors: {
      background: '#071113',
      primary: '#22b8b0',
      accent: '#0e1d1f',
    },
  },
  {
    id: 'manga',
    name: 'Shonen Ink',
    description: 'Ink, paper & a red splash',
    icon: 'ra-speech-bubble',
    isNew: true,
    colors: {
      background: '#0b0b0c',
      primary: '#e5262f',
      accent: '#f4f1ea',
    },
  },
  {
    id: 'neon',
    name: 'Neon Night',
    description: 'Synthwave magenta & cyan',
    icon: 'ra-lightning-bolt',
    isNew: true,
    colors: {
      background: '#07040d',
      primary: '#ff3fd2',
      accent: '#13304a',
    },
  },
  {
    id: 'pixel',
    name: 'Pixel Arcade',
    description: '8-bit navy, yellow & green',
    icon: 'ra-hearts',
    isNew: true,
    colors: {
      background: '#0a1030',
      primary: '#ffd93b',
      accent: '#1d2f7a',
    },
  },
  {
    id: 'celestial',
    name: 'Celestial Tarot',
    description: 'Midnight blue & gilded stars',
    icon: 'ra-crystal-ball',
    isNew: true,
    colors: {
      background: '#070a1f',
      primary: '#e6c46a',
      accent: '#141a3c',
    },
  },
  {
    id: 'solarpunk',
    name: 'Solarpunk',
    description: 'Botanical green, white & brass',
    icon: 'ra-sprout',
    isNew: true,
    colors: {
      background: '#0a1a12',
      primary: '#8fdc6a',
      accent: '#17402a',
    },
  },
];
