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
        primary: '#1d5230',
        secondary: '#386749',
        accent: '#8fbc8f',
        gold: '#b8860b',
        symbol: 'ra-mountains',
        canvasSymbol: '⛰',
        name: 'GIANTS',
        pattern: 'mountains',
      },
      ELVES: {
        primary: '#1a3a6c',
        secondary: '#35527e',
        accent: '#87ceeb',
        gold: '#c0c0c0',
        symbol: 'ra-moon-sun',
        canvasSymbol: '☽',
        name: 'ELVES',
        pattern: 'stars',
      },
      DWARVES: {
        primary: '#9b2a00',
        secondary: '#a7441f',
        accent: '#ff6b35',
        gold: '#ffd700',
        symbol: 'ra-anvil',
        canvasSymbol: '⚒',
        name: 'DWARVES',
        pattern: 'forge',
      },
      HUMANS: {
        primary: '#806a18',
        secondary: '#8f7c34',
        accent: '#f0cc40',
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
        primary: '#6a1b6a',
        secondary: '#7c367c',
        accent: '#e070c8',
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
        primary: '#006a80',
        secondary: '#1f7c8f',
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
        accent: '#ffa040',
        gold: '#ffe57f',
        symbol: 'ra-lava',
        canvasSymbol: '▲',
        name: 'VOLCANO',
        pattern: 'forge',
      },
      HUMANS: {
        primary: '#3a3f48',
        secondary: '#52565e',
        accent: '#c8b8e8',
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
        primary: '#24343a',
        secondary: '#3e4c52',
        accent: '#90a4ae',
        gold: '#b0bec5',
        symbol: 'ra-axe',
        canvasSymbol: '⚔',
        name: 'AXE',
        pattern: 'mountains',
      },
      ELVES: {
        primary: '#1a2a8e',
        secondary: '#35449c',
        accent: '#7a8aff',
        gold: '#c5cae9',
        symbol: 'ra-archer',
        canvasSymbol: '➹',
        name: 'ARCHER',
        pattern: 'stars',
      },
      DWARVES: {
        primary: '#7a4a10',
        secondary: '#8a602d',
        accent: '#e8a040',
        gold: '#d7ccc8',
        symbol: 'ra-large-hammer',
        canvasSymbol: '⛏',
        name: 'HAMMER',
        pattern: 'forge',
      },
      HUMANS: {
        primary: '#7a1424',
        secondary: '#8a303e',
        accent: '#ff6070',
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
