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
        primary: '#2f3336',
        secondary: '#4a5054',
        accent: '#c9cfd3',
        gold: '#d4af37',
        symbol: 'ra-mountains',
        canvasSymbol: '▲',
        name: 'GRANITE',
        pattern: 'mountains',
      },
      ELVES: {
        primary: '#12303a',
        secondary: '#1f4b57',
        accent: '#bfe3e8',
        gold: '#d9dde2',
        symbol: 'ra-crystals',
        canvasSymbol: '◆',
        name: 'PEARL',
        pattern: 'stars',
      },
      DWARVES: {
        primary: '#3b2116',
        secondary: '#5a3322',
        accent: '#e2b48c',
        gold: '#c8834a',
        symbol: 'ra-anvil',
        canvasSymbol: '⚒',
        name: 'BRONZE',
        pattern: 'forge',
      },
      HUMANS: {
        primary: '#4a0f17',
        secondary: '#6e1824',
        accent: '#f1d9a8',
        gold: '#e6be5a',
        symbol: 'ra-queen-crown',
        canvasSymbol: '♛',
        name: 'ROYAL',
        pattern: 'castle',
      },
    },
  },
];
