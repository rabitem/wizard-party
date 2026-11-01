import { bidAccuracy, collectEntrantRecords, compareSeries, type EntrantRecord } from './match-records';
import { TOURNAMENT_XP } from './tournament.constants';
import type { Tournament, TournamentAward, TrophyTier } from './tournament.types';

/** Everything award rules may look at, computed once when a tournament completes. */
export interface TournamentOutcome {
  tournament: Tournament;
  /** Final order, best first (the format's ranking). */
  ranking: readonly EntrantRecord[];
  /** Order after round 1 by series rules (points first), for the comeback award. */
  afterFirstRound: readonly EntrantRecord[];
  /** Rounds that were actually played. */
  roundsHeld: number;
}

/**
 * An award is a pure rule over the outcome, like an achievement over a player's history. Adding
 * one means appending a definition to TOURNAMENT_AWARDS (and an icon in the presentation layer).
 */
export interface TournamentAwardDefinition {
  id: string;
  name: string;
  description: string;
  /** lucide icon name, resolved by the presentation layer. */
  icon: string;
  tier: TrophyTier;
  /** XP before the field size factor. */
  baseXp: number;
  /** User ids receiving the award. */
  recipients(outcome: TournamentOutcome): string[];
}

/** Podium awards and best-of awards only go to players who actually played a table. */
const played = (record: EntrantRecord) => record.matchesPlayed > 0;

/**
 * A podium place must be earned at the table that decides it. In an elimination that is the
 * player's last table, so a last table that was voided (e.g. a final that timed out) or missed
 * decides no place: nobody is crowned by points from earlier rounds.
 */
const earnedPlace = (outcome: TournamentOutcome, record: EntrantRecord) =>
  played(record) && (outcome.tournament.format !== 'knockout' || record.last?.played === true);

const atRank = (rank: number) => (outcome: TournamentOutcome) => {
  const record = outcome.ranking[rank - 1];
  return record && earnedPlace(outcome, record) ? [record.entrant.userId] : [];
};

/** The best record by `value` (higher is better); ties go to the better final rank. */
const bestBy = (value: (record: EntrantRecord) => number | null, eligible: (record: EntrantRecord) => boolean) =>
  (outcome: TournamentOutcome): string[] => {
    let best: { userId: string; value: number } | null = null;
    for (const record of outcome.ranking) {
      const current = value(record);
      if (!eligible(record) || current === null || current <= 0) continue;
      if (best === null || current > best.value) best = { userId: record.entrant.userId, value: current };
    }
    return best ? [best.userId] : [];
  };

export const TOURNAMENT_AWARDS: readonly TournamentAwardDefinition[] = [
  {
    id: 'champion',
    name: 'Champion',
    description: 'Won the tournament.',
    icon: 'trophy',
    tier: 'gold',
    baseXp: 400,
    recipients: atRank(1),
  },
  {
    id: 'runner-up',
    name: 'Runner-up',
    description: 'Finished second.',
    icon: 'medal',
    tier: 'silver',
    baseXp: 250,
    recipients: atRank(2),
  },
  {
    id: 'third-place',
    name: 'Third Place',
    description: 'Finished third.',
    icon: 'award',
    tier: 'bronze',
    baseXp: 150,
    recipients: atRank(3),
  },
  {
    id: 'oracle',
    name: 'Oracle',
    description: `Best bid accuracy of the tournament (at least ${TOURNAMENT_XP.ORACLE_MIN_BIDS} bids).`,
    icon: 'eye',
    tier: 'special',
    baseXp: 120,
    recipients: bestBy(bidAccuracy, (record) => played(record) && record.totalBids >= TOURNAMENT_XP.ORACLE_MIN_BIDS),
  },
  {
    id: 'high-roller',
    name: 'High Roller',
    description: 'Highest score in a single match.',
    icon: 'coins',
    tier: 'special',
    baseXp: 80,
    recipients: bestBy((record) => record.highestMatchScore, played),
  },
  {
    id: 'comeback',
    name: 'Comeback',
    description: 'Won the tournament from the bottom half after round 1.',
    icon: 'trending-up',
    tier: 'special',
    baseXp: 150,
    recipients: (outcome) => {
      const champion = outcome.ranking[0];
      if (!champion || !earnedPlace(outcome, champion) || outcome.roundsHeld < 2) return [];
      const position = outcome.afterFirstRound.findIndex((record) => record.entrant.userId === champion.entrant.userId);
      return position + 1 > Math.ceil(outcome.afterFirstRound.length / 2) ? [champion.entrant.userId] : [];
    },
  },
  {
    id: 'iron-mage',
    name: 'Iron Mage',
    description: 'Played every round of a series.',
    icon: 'shield',
    tier: 'special',
    baseXp: 60,
    recipients: (outcome) =>
      outcome.tournament.format !== 'series' || outcome.roundsHeld < 2
        ? []
        : outcome.ranking.filter((record) => record.matchesPlayed === outcome.roundsHeld).map((record) => record.entrant.userId),
  },
  {
    id: 'finisher',
    name: 'Finisher',
    description: 'Played a tournament to the end.',
    icon: 'flag',
    tier: 'participation',
    baseXp: 50,
    recipients: (outcome) => outcome.ranking.filter(played).map((record) => record.entrant.userId),
  },
];

const AWARDS_BY_ID = new Map(TOURNAMENT_AWARDS.map((award) => [award.id, award]));

export function getTournamentAward(id: string): TournamentAwardDefinition | null {
  return AWARDS_BY_ID.get(id) ?? null;
}

/** Bigger fields are worth more: +5% per entrant beyond three, capped at double. */
export function fieldSizeFactor(entrants: number): number {
  return Math.min(TOURNAMENT_XP.FIELD_FACTOR_MAX, 1 + Math.max(0, entrants - 3) * TOURNAMENT_XP.FIELD_FACTOR_PER_ENTRANT);
}

export function awardXp(definition: Pick<TournamentAwardDefinition, 'baseXp'>, entrants: number): number {
  return Math.round(definition.baseXp * fieldSizeFactor(entrants));
}

export function buildTournamentOutcome(tournament: Tournament, ranking: readonly EntrantRecord[]): TournamentOutcome {
  return {
    tournament,
    ranking,
    afterFirstRound: collectEntrantRecords(tournament, { throughRound: 1 }).sort(compareSeries),
    roundsHeld: tournament.currentRound,
  };
}

/** Every award earned, in registry order, with XP scaled by the field size. */
export function computeAwards(outcome: TournamentOutcome, awardedAt: number): TournamentAward[] {
  const entrants = outcome.tournament.entrants.length;
  return TOURNAMENT_AWARDS.flatMap((definition) =>
    definition.recipients(outcome).map((userId) => ({
      userId,
      awardId: definition.id,
      tier: definition.tier,
      xp: awardXp(definition, entrants),
      awardedAt,
    }))
  );
}
