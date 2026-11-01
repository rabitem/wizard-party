/**
 * The score sheet a player keeps with pen and paper, for the matrix suites of levels 3 and 4: the
 * round plan from the table size and the structure rules, and each round's score from the bids and
 * the tricks the room showed at the round's end. Expected values come from the written rules
 * (docs/game-rules/rules.md, "Rounds and dealing" and "Scoring"), never from the room's own
 * scoring or round plan. Not part of the worker.
 */
import { expect } from 'vitest';
import type { IGameState, IRulesetConfig, IScoringRules } from '../../shared/domain';

/** Rounds come from the classic deck, whatever special cards were added (rules.md). */
const CLASSIC_DECK_CARDS = 60;

/** Cards dealt to each player in every round, in order. */
export function expectedRoundPlan(players: number, rules: IRulesetConfig): number[] {
  const deckLimit = Math.floor(CLASSIC_DECK_CARDS / players);
  const custom = rules.structure.customRoundCount;
  const count = custom === null ? deckLimit : Math.min(custom, deckLimit);
  return Array.from({ length: count }, (_, index) => (rules.structure.descendingRounds ? count - index : index + 1));
}

/** Exact bid: base points plus points per trick; missed: a penalty per trick off (rules.md, "Scoring"). */
export function expectedRoundScore(bid: number, tricks: number, scoring: IScoringRules): number {
  return bid === tricks ? scoring.baseBidPoints + tricks * scoring.pointsPerTrick : -Math.abs(bid - tricks) * scoring.penaltyPerMiss;
}

/** One finished round as the table showed it. */
export interface RoundLine {
  round: number;
  /** Bids as scored: a Cloud trick may have moved a bid by one after the bidding. */
  bids: Record<string, number>;
  /** Bids as placed. */
  placedBids: Record<string, number>;
  /** Tricks credited to each seat, counted from the round's completed tricks. */
  tricks: Record<string, number>;
  /** Tricks the round had, voided ones included. */
  trickCount: number;
  /** What the table showed besides: tricks won, total score, the last line of the round history. */
  shown: Record<string, { tricksWon: number; score: number; history: unknown }>;
}

/** Reads a round off a snapshot taken at its end (ROUND_END, or GAME_END for the last round). */
export function readRound(state: IGameState): RoundLine {
  const line: RoundLine = { round: state.currentRound, bids: {}, placedBids: {}, tricks: {}, trickCount: state.completedTricks.length, shown: {} };
  for (const player of state.players) {
    if (player.bid === null) throw new Error(`round ${state.currentRound} ended without a bid from ${player.name}`);
    line.bids[player.id] = player.bid;
    line.placedBids[player.id] = player.bid - (player.bidAdjustment ?? 0);
    line.tricks[player.id] = state.completedTricks.filter((trick) => !trick.voided && trick.winnerId === player.id).length;
    line.shown[player.id] = { tricksWon: player.tricksWon, score: player.score, history: player.roundHistory.at(-1) ?? null };
  }
  return line;
}

export class ScoreSheet {
  private readonly lines = new Map<number, RoundLine>();

  constructor(
    private readonly rules: IRulesetConfig,
    readonly plan: readonly number[],
    private readonly seatIds: readonly string[]
  ) {}

  /**
   * Records the round a snapshot ends (every observer of one round must show the same line) and
   * checks it against the rules: the round dealt the planned cards, so it had that many tricks;
   * every bid was in range; the hook rule held unless equal bids are allowed; each seat's tricks
   * won and running total are what the sheet says.
   */
  record(state: IGameState, who: string): void {
    const line = readRound(state);
    const known = this.lines.get(line.round);
    if (known) {
      expect(line, `${who} shows round ${line.round} differently`).toEqual(known);
      return;
    }
    const where = `${who}, round ${line.round}`;
    const cards = this.plan[line.round - 1];
    expect(cards, `${where} is beyond the round plan`).toBeDefined();
    expect(state.players.map((player) => player.id), `${where} seats`).toEqual([...this.seatIds]);
    expect(line.trickCount, `${where}: ${cards} cards each make ${cards} tricks`).toBe(cards);
    for (const bid of Object.values(line.placedBids)) expect(bid >= 0 && bid <= cards, `${where}: bid ${bid} of ${cards}`).toBe(true);
    if (!this.rules.bidding.allowEqualBids) {
      const total = Object.values(line.placedBids).reduce((sum, bid) => sum + bid, 0);
      expect(total, `${where}: the hook rule keeps the bids from adding up to the tricks`).not.toBe(cards);
    }
    this.lines.set(line.round, line);
    const totals = this.totals();
    for (const id of this.seatIds) {
      const score = expectedRoundScore(line.bids[id], line.tricks[id], this.rules.scoring);
      const extra = line.bids[id] === line.placedBids[id] ? {} : { bidAdjustment: line.bids[id] - line.placedBids[id] };
      expect(line.shown[id], `${where}: seat ${id}`).toEqual({
        tricksWon: line.tricks[id],
        score: totals[id],
        history: { bid: line.bids[id], tricksWon: line.tricks[id], score, ...extra },
      });
    }
  }

  get rounds(): RoundLine[] {
    return [...this.lines.values()].sort((a, b) => a.round - b.round);
  }

  /** Running totals over the recorded rounds. */
  totals(): Record<string, number> {
    const totals = Object.fromEntries(this.seatIds.map((id) => [id, 0]));
    for (const line of this.lines.values()) {
      for (const id of this.seatIds) totals[id] += expectedRoundScore(line.bids[id], line.tricks[id], this.rules.scoring);
    }
    return totals;
  }

  /** Every seat on the best total, in seat order (rules.md: every player on the best score wins). */
  winners(): string[] {
    const totals = this.totals();
    const best = Math.max(...Object.values(totals));
    return this.seatIds.filter((id) => totals[id] === best);
  }

  /** Every round of the plan was recorded, and no other. */
  expectComplete(): void {
    expect(this.rounds.map((line) => line.round), 'every round of the plan was scored').toEqual(this.plan.map((_, index) => index + 1));
  }
}
