import type { SandboxScenario } from '../src/presentation/components/sandbox';
import { expect, expectCleanRun, test } from './support/sandbox';

/**
 * What assistive technology finds on every browser and device: a choice the game asks of the
 * player is a modal dialog named by its title, whether it renders as a centred dialog (desktop)
 * or as a bottom sheet (phones). The golden path relies on the same names, but only reaches the
 * trump choice when its random deal turns up a Wizard.
 */

/** Seed of a deal that turns up a Wizard with you dealing (leadSeat 1), at every table size below. */
const WIZARD_TURNED_UP_SEED = 9;
const PLAYER_COUNTS = [3, 6] as const;
const SUITS = ['GIANTS', 'ELVES', 'DWARVES', 'HUMANS'] as const;

const TRUMP_CHOICE: SandboxScenario = {
  id: 'trump-choice-dialog',
  title: 'A Wizard is turned up and you choose trump',
  covers: ['trump-choice', 'accessibility'],
  table: { round: 1, leadSeat: 1, startPhase: 'TRUMP_SELECTION' },
  steps: [
    { op: 'wait-for', until: 'hand-idle' },
    { op: 'external', label: 'trump-choice' },
    { op: 'select-trump' },
    { op: 'wait-for', until: 'bidding' },
    { op: 'wait-for', until: 'idle' },
  ],
};

for (const playerCount of PLAYER_COUNTS) {
  test(`${playerCount} players: the trump choice is a dialog named "Choose Thy Trump"`, async ({ sandbox, page }) => {
    let checked = false;
    const report = await sandbox.runInteractive({ scenario: TRUMP_CHOICE, playerCount, seed: WIZARD_TURNED_UP_SEED }, async (hold) => {
      if (hold.kind !== 'external') return;
      const dialog = page.getByRole('dialog', { name: 'Choose Thy Trump' });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      await Promise.all(SUITS.map((suit) => expect(dialog.getByRole('button', { name: suit })).toBeVisible()));
      checked = true;
    });
    expect(checked, 'the deal handed you the trump choice').toBe(true);
    expectCleanRun(report);
  });
}
