// Card themes with full suit definitions
import { SEASONAL_CARD_THEMES } from './seasonal-card-themes';
import { STYLIZED_CARD_THEMES } from './stylized-card-themes';
import { TREND_CARD_THEMES } from './trend-card-themes';

export interface SuitTheme {
  primary: string;
  secondary: string;
  accent: string;
  gold: string;
  symbol: string; // RPG-Awesome icon class (e.g., 'ra-crown')
  canvasSymbol: string; // Unicode fallback for canvas rendering
  name: string;
  pattern: 'mountains' | 'stars' | 'forge' | 'castle';
}

/**
 * How card faces are rendered on canvas.
 * - classic: the original ornate fantasy rendering (default)
 * - manga: ink outlines, screentone shading, speed lines, comic numbers
 * - hyperreal: paper grain, vignette, bevelled frame, gold-foil symbols
 * - neon: dark glass card, neon outline suit glyphs, glowing numerals
 * - pixel: pixel-art faces drawn on a low-res canvas, scaled without smoothing
 * - tarot: gilded tarot frames, celestial emblems, gold-foil gradients
 * - solarpunk: botanical line art, brass corners, leaf-vein emblems
 */
export type CardArtStyle = 'classic' | 'manga' | 'hyperreal' | 'neon' | 'pixel' | 'tarot' | 'solarpunk';

export interface CardTheme {
  id: string;
  name: string;
  description: string;
  /** Highlighted with a "New" badge in settings */
  isNew?: boolean;
  /** Card face art style; omitted means 'classic' */
  artStyle?: CardArtStyle;
  suits: {
    GIANTS: SuitTheme;
    ELVES: SuitTheme;
    DWARVES: SuitTheme;
    HUMANS: SuitTheme;
  };
}

export const CARD_THEMES: CardTheme[] = [
  {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Classic fantasy symbols',
    suits: {
      GIANTS: {
        primary: '#1a472a',
        secondary: '#2d5a3d',
        accent: '#8fbc8f',
        gold: '#b8860b',
        symbol: 'ra-mountains',
        canvasSymbol: '⛰',
        name: 'GIANTS',
        pattern: 'mountains',
      },
      ELVES: {
        primary: '#1a3a5c',
        secondary: '#2a5a8c',
        accent: '#87ceeb',
        gold: '#c0c0c0',
        symbol: 'ra-moon-sun',
        canvasSymbol: '☽',
        name: 'ELVES',
        pattern: 'stars',
      },
      DWARVES: {
        primary: '#8b2500',
        secondary: '#b33a00',
        accent: '#ff6b35',
        gold: '#ffd700',
        symbol: 'ra-anvil',
        canvasSymbol: '⚒',
        name: 'DWARVES',
        pattern: 'forge',
      },
      HUMANS: {
        primary: '#4a3728',
        secondary: '#6b4423',
        accent: '#daa520',
        gold: '#ffd700',
        symbol: 'ra-crown',
        canvasSymbol: '♔',
        name: 'HUMANS',
        pattern: 'castle',
      },
    },
  },
  {
    id: 'elements',
    name: 'Elements',
    description: 'Earth, Water, Fire, Air',
    suits: {
      GIANTS: {
        primary: '#2d4a1c',
        secondary: '#3d6a2a',
        accent: '#7cb342',
        gold: '#8d6e63',
        symbol: 'ra-mountains',
        canvasSymbol: '◆',
        name: 'EARTH',
        pattern: 'mountains',
      },
      ELVES: {
        primary: '#0d47a1',
        secondary: '#1565c0',
        accent: '#42a5f5',
        gold: '#90caf9',
        symbol: 'ra-droplet',
        canvasSymbol: '≈',
        name: 'WATER',
        pattern: 'stars',
      },
      DWARVES: {
        primary: '#b71c1c',
        secondary: '#c62828',
        accent: '#ff5252',
        gold: '#ffab00',
        symbol: 'ra-fire',
        canvasSymbol: '★',
        name: 'FIRE',
        pattern: 'forge',
      },
      HUMANS: {
        primary: '#4a148c',
        secondary: '#6a1b9a',
        accent: '#ce93d8',
        gold: '#e1bee7',
        symbol: 'ra-feather-wing',
        canvasSymbol: '☆',
        name: 'AIR',
        pattern: 'castle',
      },
    },
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional card suits',
    suits: {
      GIANTS: {
        primary: '#1b5e20',
        secondary: '#2e7d32',
        accent: '#81c784',
        gold: '#ffd700',
        symbol: 'ra-spades-card',
        canvasSymbol: '♠',
        name: 'SPADES',
        pattern: 'mountains',
      },
      ELVES: {
        primary: '#0d47a1',
        secondary: '#1565c0',
        accent: '#64b5f6',
        gold: '#ffd700',
        symbol: 'ra-clover',
        canvasSymbol: '♣',
        name: 'CLUBS',
        pattern: 'stars',
      },
      DWARVES: {
        primary: '#b71c1c',
        secondary: '#c62828',
        accent: '#e57373',
        gold: '#ffd700',
        symbol: 'ra-hearts-card',
        canvasSymbol: '♥',
        name: 'HEARTS',
        pattern: 'forge',
      },
      HUMANS: {
        primary: '#e65100',
        secondary: '#f57c00',
        accent: '#ffb74d',
        gold: '#ffd700',
        symbol: 'ra-diamonds-card',
        canvasSymbol: '♦',
        name: 'DIAMONDS',
        pattern: 'castle',
      },
    },
  },
  {
    id: 'zodiac',
    name: 'Zodiac',
    description: 'Celestial symbols',
    suits: {
      GIANTS: {
        primary: '#1a237e',
        secondary: '#283593',
        accent: '#7986cb',
        gold: '#ffd54f',
        symbol: 'ra-aries',
        canvasSymbol: '♈',
        name: 'ARIES',
        pattern: 'mountains',
      },
      ELVES: {
        primary: '#004d40',
        secondary: '#00695c',
        accent: '#4db6ac',
        gold: '#80cbc4',
        symbol: 'ra-cancer',
        canvasSymbol: '♋',
        name: 'CANCER',
        pattern: 'stars',
      },
      DWARVES: {
        primary: '#bf360c',
        secondary: '#d84315',
        accent: '#ff8a65',
        gold: '#ffab40',
        symbol: 'ra-leo',
        canvasSymbol: '♌',
        name: 'LEO',
        pattern: 'forge',
      },
      HUMANS: {
        primary: '#4a148c',
        secondary: '#6a1b9a',
        accent: '#ba68c8',
        gold: '#ea80fc',
        symbol: 'ra-libra',
        canvasSymbol: '♎',
        name: 'LIBRA',
        pattern: 'castle',
      },
    },
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Flora and fauna',
    suits: {
      GIANTS: {
        primary: '#33691e',
        secondary: '#558b2f',
        accent: '#9ccc65',
        gold: '#c0ca33',
        symbol: 'ra-pine-tree',
        canvasSymbol: '✦',
        name: 'FOREST',
        pattern: 'mountains',
      },
      ELVES: {
        primary: '#006064',
        secondary: '#00838f',
        accent: '#4dd0e1',
        gold: '#84ffff',
        symbol: 'ra-ocean-emblem',
        canvasSymbol: '∿',
        name: 'OCEAN',
        pattern: 'stars',
      },
      DWARVES: {
        primary: '#e65100',
        secondary: '#ef6c00',
        accent: '#ffb74d',
        gold: '#ffe57f',
        symbol: 'ra-lava',
        canvasSymbol: '▲',
        name: 'VOLCANO',
        pattern: 'forge',
      },
      HUMANS: {
        primary: '#37474f',
        secondary: '#455a64',
        accent: '#90a4ae',
        gold: '#eceff1',
        symbol: 'ra-lightning-storm',
        canvasSymbol: '⚡',
        name: 'STORM',
        pattern: 'castle',
      },
    },
  },
  {
    id: 'combat',
    name: 'Combat',
    description: 'Weapons and warfare',
    suits: {
      GIANTS: {
        primary: '#263238',
        secondary: '#37474f',
        accent: '#78909c',
        gold: '#b0bec5',
        symbol: 'ra-axe',
        canvasSymbol: '⚔',
        name: 'AXE',
        pattern: 'mountains',
      },
      ELVES: {
        primary: '#1a237e',
        secondary: '#303f9f',
        accent: '#7986cb',
        gold: '#c5cae9',
        symbol: 'ra-archer',
        canvasSymbol: '➹',
        name: 'ARCHER',
        pattern: 'stars',
      },
      DWARVES: {
        primary: '#4e342e',
        secondary: '#5d4037',
        accent: '#a1887f',
        gold: '#d7ccc8',
        symbol: 'ra-large-hammer',
        canvasSymbol: '⛏',
        name: 'HAMMER',
        pattern: 'forge',
      },
      HUMANS: {
        primary: '#3e2723',
        secondary: '#4e342e',
        accent: '#8d6e63',
        gold: '#efebe9',
        symbol: 'ra-sword',
        canvasSymbol: '†',
        name: 'SWORD',
        pattern: 'castle',
      },
    },
  },
  ...STYLIZED_CARD_THEMES,
  ...SEASONAL_CARD_THEMES,
  ...TREND_CARD_THEMES,
];
