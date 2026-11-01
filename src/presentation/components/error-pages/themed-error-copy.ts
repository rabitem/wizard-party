import type { ThemePreference } from '@/presentation/components/settings/settings-persistence';

export type ErrorPageKind = 'not-found' | 'error';

export interface ErrorPageCopy {
  headline: string;
  body: string;
}

type ErrorCopySet = Record<ErrorPageKind, ErrorPageCopy>;

/** The original wizard-tavern copy; used by every non-seasonal theme. */
const CLASSIC_COPY: ErrorCopySet = {
  'not-found': {
    headline: 'Path Not Found',
    body: 'The scroll thou seekest hath vanished into the mists. Perhaps the spell was miscast?',
  },
  error: {
    headline: 'A Dark Curse Befell',
    body: 'An ancient spell hath gone awry. Fear not, brave wizard — the magic can be restored.',
  },
};

const SEASONAL_COPY: Partial<Record<ThemePreference, ErrorCopySet>> = {
  halloween: {
    'not-found': {
      headline: 'This Pumpkin Is Lost Too',
      body: 'Even the jack-o\'-lantern cannot light the way to this page. Something spooky must have carried it off.',
    },
    error: {
      headline: 'A Hex in the Cauldron',
      body: 'Someone stirred the brew the wrong way round. Give it another stir and the potion should settle.',
    },
  },
  autumn: {
    'not-found': {
      headline: 'Blown Off Course',
      body: 'This page drifted away on the autumn wind, like a leaf that let go of its branch.',
    },
    error: {
      headline: 'A Gust Scattered the Spell',
      body: 'The wind tossed our incantation into the leaf pile. Rake it together and try once more.',
    },
  },
  winter: {
    'not-found': {
      headline: 'Lost in the Snow',
      body: 'Our snowman searched every drift, but this page is buried somewhere under the frost.',
    },
    error: {
      headline: 'The Spell Froze Solid',
      body: 'A cold snap iced the magic mid-cast. Thaw it out and it should flow again.',
    },
  },
  spring: {
    'not-found': {
      headline: 'Nothing Blooms Here',
      body: 'This patch of garden is empty. The page you wanted never sprouted, or it was picked long ago.',
    },
    error: {
      headline: 'The Spell Wilted',
      body: 'A late frost nipped our enchantment in the bud. A little water and another try should revive it.',
    },
  },
  summer: {
    'not-found': {
      headline: 'Melted Away',
      body: 'This page sat in the sun a little too long. All that is left is a sticky puddle.',
    },
    error: {
      headline: 'Too Hot to Handle',
      body: 'The heat got to our spellbook. Find some shade, catch your breath and cast again.',
    },
  },
};

export function getErrorPageCopy(theme: ThemePreference, kind: ErrorPageKind): ErrorPageCopy {
  return (SEASONAL_COPY[theme] ?? CLASSIC_COPY)[kind];
}
