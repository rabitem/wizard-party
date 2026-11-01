import { describe, expect, it } from 'vitest';

import {
  GAME_WIN_SOUND_NAMES,
  JESTER_SOUND_NAMES,
  SOUNDBOARD_SOUND_NAMES,
  TRICK_WIN_SOUND_NAMES,
  WIZARD_SOUND_NAMES,
  resolveLegacySoundName,
} from './sound-options';

const RETIRED = {
  wizard: ['wizardVineBoom', 'wizard069', 'wizardBruh', 'wizardEpicSax', 'wizardJohnCena', 'wizardNani',
    'wizardWilhelmScream', 'wizardYeet', 'wizardOhNo', 'wizardWowCongratz'],
  jester: ['jesterWasted', 'jesterPriceIsWrong', 'jesterWrongPrice', 'jesterCurb', 'jesterWindowsError',
    'jesterWindowsXpError', 'jesterOhMyGod', 'jesterBrutal'],
  trick: ['trickWinVineBoom', 'trickWinBruh', 'trickWinHallelujah', 'trickWinYes', 'trickWinYesYesYes',
    'trickWinPoggers', 'trickWinOhYeah', 'trickWinNice', 'trickWinEz', 'trickWinWin', 'trickWinWinners'],
  game: ['gameWinFlawless'],
};

describe('resolveLegacySoundName', () => {
  it('should leave current sound ids and non-strings unchanged', () => {
    for (const name of SOUNDBOARD_SOUND_NAMES) expect(resolveLegacySoundName(name)).toBe(name);
    expect(resolveLegacySoundName('random')).toBe('random');
    expect(resolveLegacySoundName(undefined)).toBeUndefined();
    expect(resolveLegacySoundName('toString')).toBe('toString');
  });

  it('should map every retired id to a current sound of the same group', () => {
    const groups: Array<[string[], readonly string[]]> = [
      [RETIRED.wizard, WIZARD_SOUND_NAMES],
      [RETIRED.jester, JESTER_SOUND_NAMES],
      [RETIRED.trick, TRICK_WIN_SOUND_NAMES],
      [RETIRED.game, GAME_WIN_SOUND_NAMES],
    ];
    for (const [retired, current] of groups) {
      for (const name of retired) expect(current, name).toContain(resolveLegacySoundName(name));
    }
  });
});
