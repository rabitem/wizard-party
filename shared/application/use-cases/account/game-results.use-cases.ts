import {
  ACCOUNT_LIMITS,
  deriveBaseline,
  validateGameResult,
  xpForBaseline,
  xpForGame,
  type GameResult,
  type PlayerStatsSummary,
} from '../../../domain/account';
import type { IClock, IGameResultRepository, IPlayerProgressRepository } from '../../ports/account';
import { AccountError } from './account-error';
import type { PlayerProgressView, ProgressCalculator } from './progress-calculator';

function validateBatch(values: unknown, now: number): GameResult[] {
  if (!Array.isArray(values) || values.length > ACCOUNT_LIMITS.MAX_RESULTS_PER_BATCH) {
    throw new AccountError('invalid_input', `expected up to ${ACCOUNT_LIMITS.MAX_RESULTS_PER_BATCH} results`);
  }
  const results = values.map((value) => validateGameResult(value, now));
  const invalid = results.findIndex((result) => result === null);
  if (invalid !== -1) throw new AccountError('invalid_input', `result ${invalid} is invalid`);
  return results as GameResult[];
}

export interface RecordGameResultsOutput extends PlayerProgressView {
  recorded: string[];
}

/** Stores finished games of a signed-in player. Idempotent per clientGameId. */
export class RecordGameResultsUseCase {
  constructor(
    private readonly results: IGameResultRepository,
    private readonly calculator: ProgressCalculator,
    private readonly clock: IClock
  ) {}

  async execute(userId: string, input: unknown): Promise<RecordGameResultsOutput> {
    const results = validateBatch(input, this.clock.now());
    const recorded = await this.results.insertMany(userId, results.map((result) => ({ ...result, xp: xpForGame(result) })));
    const view = await this.calculator.compute(userId, { persist: true });
    return { ...view, recorded };
  }
}

const MAX_IMPORTED_GAMES = 100_000;

function validateAggregate(value: unknown): PlayerStatsSummary {
  if (typeof value !== 'object' || value === null) throw new AccountError('invalid_input', 'stats missing');
  const v = value as Record<string, unknown>;
  const count = (key: string, max = MAX_IMPORTED_GAMES * 20) => {
    const n = v[key];
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > max) throw new AccountError('invalid_input', `invalid ${key}`);
    return n;
  };
  const score = (key: string) => {
    const n = v[key];
    if (typeof n !== 'number' || !Number.isFinite(n)) throw new AccountError('invalid_input', `invalid ${key}`);
    return Math.trunc(n);
  };
  const gamesPlayed = count('gamesPlayed', MAX_IMPORTED_GAMES);
  const gamesWon = Math.min(gamesPlayed, count('gamesWon', MAX_IMPORTED_GAMES));
  const totalBids = count('totalBids');
  return {
    gamesPlayed,
    gamesWon,
    totalScore: score('totalScore'),
    totalRounds: count('totalRounds'),
    correctBids: Math.min(totalBids, count('correctBids')),
    totalBids,
    totalTricksWon: count('totalTricksWon'),
    highestScore: score('highestScore'),
    lowestScore: gamesPlayed === 0 ? null : score('lowestScore'),
    bestWinStreak: Math.min(gamesWon, count('bestWinStreak', MAX_IMPORTED_GAMES)),
    currentWinStreak: 0,
    totalPlacement: Math.max(gamesPlayed, count('totalPlacement')),
  };
}

export interface ImportGuestProgressInput {
  stats: unknown;
  history: unknown;
}

/**
 * Moves the progress a player made as a guest in one browser into their account. Allowed once
 * per account, so the same browser history cannot be imported repeatedly.
 */
export class ImportGuestProgressUseCase {
  constructor(
    private readonly results: IGameResultRepository,
    private readonly progress: IPlayerProgressRepository,
    private readonly calculator: ProgressCalculator,
    private readonly clock: IClock
  ) {}

  async execute(userId: string, input: ImportGuestProgressInput): Promise<PlayerProgressView> {
    const aggregate = validateAggregate(input.stats);
    const history = validateBatch(input.history, this.clock.now());
    const baseline = deriveBaseline(aggregate, history);

    if (!(await this.progress.setBaselineOnce(userId, baseline, xpForBaseline(baseline)))) {
      throw new AccountError('already_imported', 'guest progress was already imported into this account');
    }
    await this.results.insertMany(userId, history.map((result) => ({ ...result, xp: xpForGame(result) })));
    return this.calculator.compute(userId, { persist: true });
  }
}
