// Table palettes for the trend packs: ink lacquer (manga), neon glass, pixel arcade,
// celestial velvet and solarpunk birch. Spread into TABLE_THEME_PALETTES.
import type { TableThemePalette } from './table-theme.config';

export const TREND_TABLE_THEME_PALETTES: TableThemePalette[] = [
  {
    id: 'manga',
    name: 'Ink Dojo',
    bg: 'from-neutral-950 via-stone-900 to-black',
    isNew: true,
    felt: {
      base: '#ece8de',
      edge: '#d9d4c6',
      center: '#f6f3eb',
      stitch: '#2a2a2a',
    },
    accent: {
      innerRing: '#e5262f',
      outerRing: '#111111',
    },
    wood: {
      base: '#141414',
      molding: '#0a0a0a',
      apron: '#060606',
    },
    leather: {
      base: '#1a1a1a',
    },
  },
  {
    id: 'neon',
    name: 'Neon Grid',
    bg: 'from-fuchsia-950 via-violet-950 to-black',
    isNew: true,
    felt: {
      base: '#0d0a18',
      edge: '#090712',
      center: '#120e22',
      stitch: '#22e5ff',
    },
    accent: {
      innerRing: '#22e5ff',
      outerRing: '#ff3fd2',
    },
    wood: {
      base: '#111018',
      molding: '#0a0910',
      apron: '#06050a',
    },
    leather: {
      base: '#140c22',
    },
  },
  {
    id: 'pixel',
    name: 'Pixel Arcade',
    bg: 'from-blue-950 via-indigo-950 to-slate-950',
    isNew: true,
    felt: {
      base: '#2a8a3a',
      edge: '#1f6e2d',
      center: '#33a045',
      stitch: '#16501f',
    },
    accent: {
      innerRing: '#ffd93b',
      outerRing: '#ff9f1c',
    },
    wood: {
      base: '#2b3a8f',
      molding: '#1d2766',
      apron: '#141b4a',
    },
    leather: {
      base: '#101740',
    },
  },
  {
    id: 'celestial',
    name: 'Star Chamber',
    bg: 'from-indigo-950 via-blue-950 to-slate-950',
    isNew: true,
    felt: {
      base: '#1a2050',
      edge: '#13183e',
      center: '#202862',
      stitch: '#0c102c',
    },
    accent: {
      innerRing: '#e6c46a',
      outerRing: '#c9a24a',
    },
    wood: {
      base: '#1a1838',
      molding: '#100f26',
      apron: '#0b0a1c',
    },
    leather: {
      base: '#12102a',
    },
  },
  {
    id: 'solarpunk',
    name: 'Verdant Atrium',
    bg: 'from-emerald-950 via-green-950 to-lime-950',
    isNew: true,
    felt: {
      base: '#4a7a3a',
      edge: '#3c652f',
      center: '#568a44',
      stitch: '#2c4c22',
    },
    accent: {
      innerRing: '#d9b45a',
      outerRing: '#b8913a',
    },
    wood: {
      base: '#d8c4a0',
      molding: '#bfa67c',
      apron: '#a68c64',
    },
    leather: {
      base: '#3a5a2e',
    },
  },
];
