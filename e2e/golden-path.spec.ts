import { expect, test, type Locator, type Page } from '@playwright/test';
import { CONSTANTS } from '../src/presentation/config/constants';
import { DEFAULT_RULESET_CONFIG, RULESET_LIMITS, TURN_TIMER_LIMITS } from '../shared/domain/value-objects/ruleset-config';

/**
 * The golden path through the real app: Next pages and router, PartySocket over a browser
 * WebSocket, the local game worker (`npm run dev:party`) and the seat token across a reload.
 * The sandbox suites and the in-process tests never see these together. CI runs it in the verify
 * job against the build that job made: `npx playwright test --project=golden-path`.
 */

/** The shortest game the rules allow: one round, in which each player holds one card. */
const ROUNDS = RULESET_LIMITS.CUSTOM_ROUND_COUNT.MIN;
/** Rounds deal ascending by default: round n deals n cards. */
const CARDS_IN_HAND = ROUNDS;
/** The shortest play timer the server accepts; when it runs out the room plays for the player. */
const PLAY_TIMER_SECONDS = TURN_TIMER_LIMITS.MIN_SECONDS;
/**
 * The longest bidding timer, set before the play timer: left unset, the rule editor derives one
 * from the play timer (getDefaultBiddingTimerSeconds) and the room would bid for the guest while
 * the reload step waits for the page to come back.
 */
const BIDDING_TIMER_SECONDS = TURN_TIMER_LIMITS.MAX_SECONDS;
/** Bots move 800 ms after each change; a turn reaches the guest well inside this. */
const TURN_WAIT_MS = 30_000;
/** The play timer, the room's auto-act delay after it (TURN_TIMEOUT_POLICY) and the trick's presentation. */
const AUTO_PLAY_WAIT_MS = 60_000;
/**
 * Table sizes: the guest plus bots. Every table size is proven in process (the level-4 table
 * matrix); here a size only adds the real pages' lobby and results at that many seats. CI plays the
 * smallest table on every pull request; the weekly run (E2E_FULL_MATRIX=1) adds the largest.
 */
const SEAT_COUNTS = process.env.E2E_FULL_MATRIX === '1' ? [3, 6] : [3];
const GUEST_NAME = 'Ann';

// Each game has its own room; with two workers the table sizes play at the same time.
test.describe.configure({ mode: 'parallel' });

interface Standing {
  madeBid: boolean;
  roundsBid: number;
  tricks: number;
  score: number;
}

function numberIn(text: string | null): number {
  return Number(text?.match(/-?\d+/)?.[0]);
}

/** The number input of one rule row in the rule editor (the inputs have no label of their own). */
function ruleInput(sheet: Locator, ruleName: string): Locator {
  const page = sheet.page();
  return sheet
    .locator('div')
    .filter({ has: page.getByText(ruleName, { exact: true }) })
    .filter({ has: page.getByRole('spinbutton') })
    .last()
    .getByRole('spinbutton');
}

/**
 * Opens one rule category and sets its rules in order. Each rule starts at its default, so after
 * the n-th change the category badge reads "n modified".
 */
async function setRules(sheet: Locator, category: string, rules: ReadonlyArray<readonly [ruleName: string, value: number]>): Promise<void> {
  const categoryButton = sheet.getByRole('button', { name: new RegExp(`^${category}`) });
  await categoryButton.click();
  for (const [index, [ruleName, value]] of rules.entries()) {
    const input = ruleInput(sheet, ruleName);
    await input.fill(String(value));
    await input.press('Enter');
    // The badge counts the rules the room sent back: the next change must build on this one.
    await expect(categoryButton).toHaveAccessibleName(new RegExp(`(^|\\D)${index + 1} modified$`));
    await expect(input).toHaveValue(String(value));
  }
}

async function addBot(page: Page, seatedAfter: number): Promise<void> {
  await page.getByRole('button', { name: /^Open seat \d+: invite a friend or add a bot$/ }).first().click();
  await page.getByRole('dialog', { name: /^Fill seat \d+$/ }).getByRole('button', { name: /^Add \w+ bot$/ }).click();
  await expect(page.getByRole('group', { name: new RegExp(`^Table, ${seatedAfter} of \\d+ seats taken$`) })).toBeVisible();
}

/** Waits until the guest is asked to bid, choosing trump first when the deal hands them that choice. */
async function waitForBidTurn(page: Page): Promise<Locator> {
  const bidChips = page.getByRole('button', { name: /^Bid \d+( \(forbidden\))?$/ });
  const trumpChoice = page.getByRole('dialog', { name: 'Choose Thy Trump' });
  await expect(bidChips.or(trumpChoice).first()).toBeVisible({ timeout: TURN_WAIT_MS });
  if (await trumpChoice.isVisible()) {
    await trumpChoice.getByRole('button', { name: /^(?!Close$)/ }).first().click();
    await expect(bidChips.first()).toBeVisible({ timeout: TURN_WAIT_MS });
  }
  return bidChips;
}

async function readStanding(row: Locator): Promise<Standing> {
  const [perfect, tricks, score] = await Promise.all([
    row.getByText(/^\d+\/\d+ perfect$/).textContent(),
    row.getByText(/^\d+ tricks$/).textContent(),
    row.getByText(/^-?\d+$/).textContent(),
  ]);
  const [made, roundsBid] = (perfect?.match(/\d+/g) ?? []).map(Number);
  return { madeBid: made === 1, roundsBid, tricks: numberIn(tricks), score: numberIn(score) };
}

/** One round of one card: bid and tricks are 0 or 1, so a missed bid is off by exactly one trick. */
function oneCardRoundScore(madeBid: boolean, tricks: number): number {
  const { baseBidPoints, pointsPerTrick, penaltyPerMiss } = DEFAULT_RULESET_CONFIG.scoring;
  return madeBid ? baseBidPoints + tricks * pointsPerTrick : -penaltyPerMiss;
}

for (const seats of SEAT_COUNTS) test(`${seats} seats: a guest creates a room, adds ${seats - 1} bots, plays a one-round game, reloads mid-game into the same seat, and lands on the results`, async ({ page }) => {
  // About 45 s, most of it the room's auto-act wait; the cap leaves room for a slow runner.
  test.setTimeout(2 * 60_000);
  // The first-visit tutorial has no labelled close control; a returning guest has seen it.
  await page.addInitScript((key) => window.localStorage.setItem(key, 'true'), CONSTANTS.STORAGE_KEYS.TUTORIAL_SEEN);

  await test.step('create a room as a guest', async () => {
    await page.goto('/');
    await page.getByRole('dialog', { name: 'Privacy settings' }).getByRole('button', { name: 'Essential only' }).click();
    await page.getByLabel('What should we call you?').fill(GUEST_NAME);
    await page.getByRole('region', { name: 'Play' }).getByRole('button', { name: /^Create room/ }).click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page).toHaveURL(/\/lobby\/[a-z0-9]+$/);
  });
  const roomId = new URL(page.url()).pathname.replace('/lobby/', '');
  let placedBid = -1;

  await test.step('set one round, a short play timer and a bidding timer out of reach', async () => {
    await page.getByRole('button', { name: 'Table settings' }).click();
    const sheet = page.getByRole('dialog', { name: 'Table settings' });
    await setRules(sheet, 'Game Structure', [['Custom Round Count', ROUNDS]]);
    // Bidding first: an explicit bidding timer is kept when the play timer changes.
    await setRules(sheet, 'Turn Timer', [['Bidding Timer', BIDDING_TIMER_SECONDS], ['Play Timer', PLAY_TIMER_SECONDS]]);
    await sheet.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(sheet).toBeHidden();
  });

  await test.step(`seat ${seats - 1} bots and start`, async () => {
    for (let seated = 2; seated <= seats; seated++) await addBot(page, seated);
    await page.getByRole('button', { name: `Start game · ${seats} players` }).click();
    await expect(page).toHaveURL(new RegExp(`/game/${roomId}$`));
  });

  await test.step('reload while bidding and keep the seat and the hand', async () => {
    // Only the seat whose turn it is gets bid chips, one per bid from 0 to the cards in hand.
    const bidChips = await waitForBidTurn(page);
    await expect(bidChips).toHaveCount(CARDS_IN_HAND + 1);
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/game/${roomId}$`));
    await expect(await waitForBidTurn(page)).toHaveCount(CARDS_IN_HAND + 1);
  });

  await test.step('bid through the chips and let the play timer play the card', async () => {
    const allowedBid = page.getByRole('button', { name: /^Bid \d+$/ }).first();
    placedBid = numberIn(await allowedBid.getAttribute('aria-label'));
    await allowedBid.click();
    await page.getByRole('button', { name: `Place bid ${placedBid}`, exact: true }).click();
    await expect(page.getByRole('button', { name: /^Bid \d+/ })).toHaveCount(0);
    // No canvas input: when the play timer runs out the room plays the first legal card.
    await expect(page).toHaveURL(new RegExp(`/results/${roomId}$`), { timeout: AUTO_PLAY_WAIT_MS });
  });

  await test.step('show the final standings by the scoring rules', async () => {
    await expect(page.getByRole('heading', { level: 1, name: /^(Victory!|Game Over)$/ })).toBeVisible();
    const rows = page.getByRole('button').filter({ hasText: /\d+\/\d+ perfect/ });
    await expect(rows).toHaveCount(seats);
    const standings = await Promise.all((await rows.all()).map(readStanding));

    for (const standing of standings) {
      expect(standing.roundsBid).toBe(ROUNDS);
      expect(standing.score).toBe(oneCardRoundScore(standing.madeBid, standing.tricks));
    }
    // One card each: exactly one trick was played, and somebody won it.
    expect(standings.reduce((sum, standing) => sum + standing.tricks, 0)).toBe(CARDS_IN_HAND);
    const scores = standings.map((standing) => standing.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    // The guest finished in the seat they started in, under their name.
    const ownRow = rows.filter({ has: page.getByText('You', { exact: true }) });
    await expect(ownRow).toHaveCount(1);
    await expect(ownRow).toContainText(GUEST_NAME);
    // The room scored the bid the guest placed through the chips, not one it made up for them.
    const own = await readStanding(ownRow);
    expect(own.madeBid).toBe(own.tricks === placedBid);
  });
});
