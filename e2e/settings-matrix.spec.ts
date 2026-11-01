import { COLLECTION_ANIMATION_MODE_IDS } from '../src/presentation/config/collection-animation.config';
import { SANDBOX_PLAYER_COUNTS } from '../src/presentation/config/sandbox.config';
import { CARD_THEMES } from '../src/presentation/components/settings/card-theme-presets';
import { CARD_NUMBER_SIZE_PRESETS, TABLE_THEMES, THEME_PRESETS } from '../src/presentation/components/settings/visual-presets';
import { allPairs, describeRow, eachChoice } from './support/matrix';
import { expectCleanRun, test } from './support/sandbox';

/**
 * Settings crossed with play, in its own projects (settings-matrix on Chromium, Firefox, WebKit
 * and a touch phone): card theme, table theme, UI theme, collection style, card number size and
 * reduced motion, each with a scenario and a table size. Each environment, card face and HUD skin
 * brings its own meshes, materials and layout, so a combination can break throws, landing,
 * collection, legibility or HUD placement that every other combination gets right.
 *
 * Pull requests and dispatches run every value at least once (eachChoice); the weekly run
 * (E2E_FULL_MATRIX=1) runs every pair of values (allPairs, about 300 rows). The values are read
 * from the presets, so a new theme joins the matrix without a spec change. Every row deals the
 * sandbox's default seed: which cards a hand holds is no rendering risk of its own, and its size
 * comes from the scenario and the table size.
 */
const FULL_MATRIX = process.env.E2E_FULL_MATRIX === '1';

/**
 * Scenarios that render every setting: throws and collection (baseline-trick), the largest hand's
 * legibility and HUD layout (max-hand), wizard and jester faces (special-cards), the round
 * transition overlay (round-transition) and the results screen (game-end).
 */
const SCENARIOS = ['baseline-trick', 'max-hand', 'special-cards', 'round-transition', 'game-end'] as const;

/**
 * prefers-reduced-motion: the table environments swap ambient motion for still frames
 * (usePrefersReducedMotion) and the HUD skins drop their CSS animations; the trick lifecycle must
 * not wait on a motion that no longer runs.
 */
const MOTION = ['no-preference', 'reduce'] as const;

const AXES = {
  cardTheme: CARD_THEMES.map((theme) => theme.id),
  tableTheme: TABLE_THEMES.map((theme) => theme.id),
  theme: THEME_PRESETS.map((theme) => theme.id),
  collectionAnimation: [...COLLECTION_ANIMATION_MODE_IDS],
  cardNumberSize: CARD_NUMBER_SIZE_PRESETS.map((preset) => preset.id),
  scenario: SCENARIOS,
  playerCount: SANDBOX_PLAYER_COUNTS,
  motion: MOTION,
};

const ROWS = FULL_MATRIX ? allPairs(AXES) : eachChoice(AXES);

for (const [index, row] of ROWS.entries()) {
  const { scenario, playerCount, motion, ...settings } = row;
  test.describe(`settings ${index + 1}/${ROWS.length}`, () => {
    test.use({ reducedMotion: motion });

    test(`${describeRow(row)} plays cleanly`, async ({ sandbox }) => {
      expectCleanRun(await sandbox.run({ id: `settings-${index + 1}-${scenario}-${playerCount}p`, scenario, playerCount, settings }));
    });
  });
}
