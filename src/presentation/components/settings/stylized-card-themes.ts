// Card decks that use a non-classic card face art style (Manga, Hyperreal)
import type { CardTheme } from './card-theme-presets';

/**
 * Manga colour roles: primary = ink, secondary = paper, accent = the one
 * spot colour of the suit, gold = screentone tint.
 *
 * Hyperreal colour roles: primary/secondary = paper/leather base, accent =
 * suit name ink, gold = the foil metal used for symbols, numbers and frame.
 */
export const STYLIZED_CARD_THEMES: CardTheme[] = [
  {
    id: 'manga',
    name: 'Manga',
    description: 'Ink, screentone & speed lines',
    isNew: true,
    artStyle: 'manga',
    suits: {
      GIANTS: {
        primary: '#111111',
        secondary: '#f7f4ec',
        accent: '#2e9e4f',
        gold: '#3a3a3a',
        symbol: 'ra-dragon',
        canvasSymbol: '☄',
        name: 'KAIJU',
        pattern: 'mountains',
      },
      ELVES: {
        primary: '#111111',
        secondary: '#f4f6fb',
        accent: '#2563eb',
        gold: '#3a3a3a',
        symbol: 'ra-shuriken',
        canvasSymbol: '✦',
        name: 'SHINOBI',
        pattern: 'stars',
      },
      DWARVES: {
        primary: '#111111',
        secondary: '#fbf5ee',
        accent: '#f97316',
        gold: '#3a3a3a',
        symbol: 'ra-gear-hammer',
        canvasSymbol: '⚙',
        name: 'MECHA',
        pattern: 'forge',
      },
      HUMANS: {
        primary: '#111111',
        secondary: '#fbf1f1',
        accent: '#e11d48',
        gold: '#3a3a3a',
        symbol: 'ra-crossed-swords',
        canvasSymbol: '⚔',
        name: 'RONIN',
        pattern: 'castle',
      },
    },
  },
  {
    id: 'hyperreal',
    name: 'Hyperreal',
    description: 'Linen paper, embossing & gold foil',
    isNew: true,
    artStyle: 'hyperreal',
    suits: {
      GIANTS: {
        primary: '#2a2e30',
        secondary: '#444749',
        accent: '#c9cfd3',
        gold: '#d4af37',
        symbol: 'ra-mountains',
        canvasSymbol: '▲',
        name: 'GRANITE',
        pattern: 'mountains',
      },
      ELVES: {
        primary: '#0a3e78',
        secondary: '#275588',
        accent: '#78c0ff',
        gold: '#d9dde2',
        symbol: 'ra-crystals',
        canvasSymbol: '◆',
        name: 'PEARL',
        pattern: 'stars',
      },
      DWARVES: {
        primary: '#8a5014',
        secondary: '#986530',
        accent: '#f0a050',
        gold: '#c8834a',
        symbol: 'ra-anvil',
        canvasSymbol: '⚒',
        name: 'BRONZE',
        pattern: 'forge',
      },
      HUMANS: {
        primary: '#6a0a30',
        secondary: '#7c2749',
        accent: '#ff8aa0',
        gold: '#e6be5a',
        symbol: 'ra-queen-crown',
        canvasSymbol: '♛',
        name: 'ROYAL',
        pattern: 'castle',
      },
    },
  },
];
