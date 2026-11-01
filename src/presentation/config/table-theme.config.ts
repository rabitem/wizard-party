import { TREND_TABLE_THEME_PALETTES } from './trend-table-themes.config';

export interface TableThemePalette {
  id: string;
  name: string;
  bg: string;
  /** Highlighted with a "New" badge in settings */
  isNew?: boolean;
  felt: {
    base: string;
    edge: string;
    center: string;
    stitch: string;
  };
  accent: {
    innerRing: string;
    outerRing: string;
  };
  wood: {
    base: string;
    molding: string;
    apron: string;
  };
  leather: {
    base: string;
  };
}

export const DEFAULT_TABLE_THEME_ID = 'default';

export const TABLE_THEME_PALETTES: TableThemePalette[] = [
  {
    id: DEFAULT_TABLE_THEME_ID,
    name: 'Classic Casino',
    bg: 'from-zinc-950 via-stone-950 to-neutral-950',
    felt: {
      base: '#205f43',
      edge: '#174a34',
      center: '#123b2a',
      stitch: '#0c2b1e',
    },
    accent: {
      innerRing: '#d4a84b',
      outerRing: '#c9a227',
    },
    wood: {
      base: '#6f4426',
      molding: '#4a2d18',
      apron: '#382214',
    },
    leather: {
      base: '#2d1712',
    },
  },
  {
    id: 'forest',
    name: 'Enchanted Forest',
    bg: 'from-emerald-950 via-green-950 to-slate-950',
    felt: {
      base: '#1d6b45',
      edge: '#145536',
      center: '#124a2d',
      stitch: '#0d3a22',
    },
    accent: {
      innerRing: '#c7a94b',
      outerRing: '#a9872b',
    },
    wood: {
      base: '#7b5a36',
      molding: '#4f3a22',
      apron: '#3d2d1d',
    },
    leather: {
      base: '#263d22',
    },
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    bg: 'from-blue-950 via-cyan-950 to-slate-950',
    felt: {
      base: '#0f5f78',
      edge: '#0a4558',
      center: '#073746',
      stitch: '#052a36',
    },
    accent: {
      innerRing: '#b9d9e8',
      outerRing: '#78b8d0',
    },
    wood: {
      base: '#5c4a33',
      molding: '#3f3425',
      apron: '#30271d',
    },
    leather: {
      base: '#18324a',
    },
  },
  {
    id: 'fire',
    name: "Dragon's Lair",
    bg: 'from-red-950 via-orange-950 to-slate-950',
    felt: {
      base: '#7a2618',
      edge: '#571a12',
      center: '#42120d',
      stitch: '#2f0c08',
    },
    accent: {
      innerRing: '#f0a040',
      outerRing: '#d06b22',
    },
    wood: {
      base: '#8b4a2b',
      molding: '#5b2f1c',
      apron: '#472316',
    },
    leather: {
      base: '#4a1712',
    },
  },
  {
    id: 'dark',
    name: 'Void',
    bg: 'from-zinc-950 via-neutral-950 to-black',
    felt: {
      base: '#202026',
      edge: '#17171d',
      center: '#101014',
      stitch: '#09090d',
    },
    accent: {
      innerRing: '#9a8f76',
      outerRing: '#6d6656',
    },
    wood: {
      base: '#4b4540',
      molding: '#2d2926',
      apron: '#211f1d',
    },
    leather: {
      base: '#171717',
    },
  },
  {
    id: 'gold',
    name: 'Royal Chamber',
    bg: 'from-amber-950 via-yellow-950 to-slate-950',
    felt: {
      base: '#6f5420',
      edge: '#4f3a15',
      center: '#3e2d10',
      stitch: '#2d200b',
    },
    accent: {
      innerRing: '#f2d275',
      outerRing: '#d4a853',
    },
    wood: {
      base: '#9c6f38',
      molding: '#6f4822',
      apron: '#543619',
    },
    leather: {
      base: '#4a3118',
    },
  },
  {
    id: 'halloween',
    name: 'Haunted Manor',
    bg: 'from-purple-950 via-orange-950 to-black',
    isNew: true,
    felt: {
      base: '#3a1f4a',
      edge: '#2b1638',
      center: '#1f0f29',
      stitch: '#150a1c',
    },
    accent: {
      innerRing: '#ff8a1f',
      outerRing: '#d4621a',
    },
    wood: {
      base: '#2e2622',
      molding: '#1c1714',
      apron: '#14100e',
    },
    leather: {
      base: '#1c0f24',
    },
  },
  {
    id: 'autumn',
    name: 'Autumn Harvest',
    bg: 'from-orange-950 via-amber-950 to-stone-950',
    isNew: true,
    felt: {
      base: '#7a3e1d',
      edge: '#5f3016',
      center: '#4c2611',
      stitch: '#371b0c',
    },
    accent: {
      innerRing: '#e8b04a',
      outerRing: '#c4862e',
    },
    wood: {
      base: '#7a4a24',
      molding: '#4f2e16',
      apron: '#3d2311',
    },
    leather: {
      base: '#4a2412',
    },
  },
  {
    id: 'winter',
    name: 'Frozen Hall',
    bg: 'from-slate-900 via-sky-950 to-slate-950',
    isNew: true,
    felt: {
      base: '#3b5568',
      edge: '#2e4555',
      center: '#243846',
      stitch: '#1a2a35',
    },
    accent: {
      innerRing: '#e8eef4',
      outerRing: '#c9a76a',
    },
    wood: {
      base: '#6b4a32',
      molding: '#46301f',
      apron: '#36241a',
    },
    leather: {
      base: '#3a2a22',
    },
  },
  {
    id: 'spring',
    name: 'Blossom Garden',
    bg: 'from-emerald-950 via-rose-950 to-stone-950',
    isNew: true,
    felt: {
      base: '#3f7a4a',
      edge: '#31623b',
      center: '#27512f',
      stitch: '#1c3d23',
    },
    accent: {
      innerRing: '#f2a7c3',
      outerRing: '#d987a8',
    },
    wood: {
      base: '#8a6a48',
      molding: '#5e4630',
      apron: '#4a3624',
    },
    leather: {
      base: '#4a2e3a',
    },
  },
  {
    id: 'summer',
    name: 'Sunlit Terrace',
    bg: 'from-teal-950 via-cyan-950 to-amber-950',
    isNew: true,
    felt: {
      base: '#11706d',
      edge: '#0d5855',
      center: '#0a4846',
      stitch: '#073634',
    },
    accent: {
      innerRing: '#f6c95a',
      outerRing: '#e0a03a',
    },
    wood: {
      base: '#a07a4e',
      molding: '#73552f',
      apron: '#5a4224',
    },
    leather: {
      base: '#5a3a1e',
    },
  },
  ...TREND_TABLE_THEME_PALETTES,
];

const TABLE_THEME_BY_ID = new Map(TABLE_THEME_PALETTES.map((theme) => [theme.id, theme]));
const DEFAULT_TABLE_THEME = TABLE_THEME_BY_ID.get(DEFAULT_TABLE_THEME_ID) ?? TABLE_THEME_PALETTES[0];

export function getTableTheme(themeId: string | null | undefined): TableThemePalette {
  return TABLE_THEME_BY_ID.get(themeId ?? '') ?? DEFAULT_TABLE_THEME;
}
