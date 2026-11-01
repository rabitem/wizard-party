import { describe, expect, it } from 'vitest';

import { CardType } from './card-types';
import { DEFAULT_RULESET_CONFIG, type IRulesetConfig } from './ruleset-config';
import { validateRulesetConfig } from './ruleset-validation';

/*
 * validateRulesetConfig is the strict check for rules that arrive from outside (tournament
 * settings, match tickets): unlike ensureRulesetConfig it never repairs a value, it refuses it.
 */

type Change = Partial<{ [K in keyof IRulesetConfig]: Partial<Record<keyof IRulesetConfig[K], unknown>> }>;

function rulesWith(change: Change): Record<string, unknown> {
  const config = structuredClone(DEFAULT_RULESET_CONFIG) as unknown as Record<string, unknown>;
  for (const [category, fields] of Object.entries(change)) {
    config[category] = { ...(config[category] as object), ...fields };
  }
  return config;
}

function errorsOf(config: unknown): string[] {
  const result = validateRulesetConfig(config);
  return result.success ? [] : result.errors;
}

describe('validateRulesetConfig', () => {
  it('accepts the classic rules unchanged', () => {
    expect(validateRulesetConfig(structuredClone(DEFAULT_RULESET_CONFIG))).toEqual({ success: true, data: DEFAULT_RULESET_CONFIG });
  });

  it('accepts every rule at the edges of its allowed range', () => {
    const edges: Change = {
      card: { lastWizardWins: true, lastJesterWins: true },
      bidding: { hiddenBids: true, allowEqualBids: true },
      scoring: { baseBidPoints: 100, pointsPerTrick: 0, penaltyPerMiss: 50 },
      structure: { customRoundCount: 20, descendingRounds: true },
      turn: { biddingTimerSeconds: 5, playTimerSeconds: 180, timeoutSoundVolume: 0 },
      expansions: { specialCards: [CardType.BOMB, CardType.WITCH] },
    };

    const result = validateRulesetConfig(rulesWith(edges));

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.scoring).toEqual({ baseBidPoints: 100, pointsPerTrick: 0, penaltyPerMiss: 50 });
    expect(result.data.structure).toEqual({ customRoundCount: 20, descendingRounds: true });
    expect(result.data.turn).toEqual({ biddingTimerSeconds: 5, playTimerSeconds: 180, timeoutSoundVolume: 0 });
    expect(result.data.expansions.specialCards).toEqual(expect.arrayContaining([CardType.BOMB, CardType.WITCH]));
  });

  it.each<[string, Change, string]>([
    ['a Wizard rule that is not a boolean', { card: { lastWizardWins: 'yes' } }, 'card.lastWizardWins'],
    ['a Jester rule that is missing', { card: { lastJesterWins: undefined } }, 'card.lastJesterWins'],
    ['hidden bids given as 1', { bidding: { hiddenBids: 1 } }, 'bidding.hiddenBids'],
    ['equal bids given as a string', { bidding: { allowEqualBids: 'false' } }, 'bidding.allowEqualBids'],
    ['base points above 100', { scoring: { baseBidPoints: 101 } }, 'scoring.baseBidPoints'],
    ['fractional points per trick', { scoring: { pointsPerTrick: 10.5 } }, 'scoring.pointsPerTrick'],
    ['a negative penalty', { scoring: { penaltyPerMiss: -10 } }, 'scoring.penaltyPerMiss'],
    ['a penalty that is not a number', { scoring: { penaltyPerMiss: Number.NaN } }, 'scoring.penaltyPerMiss'],
    ['zero rounds', { structure: { customRoundCount: 0 } }, 'structure.customRoundCount'],
    ['21 rounds', { structure: { customRoundCount: 21 } }, 'structure.customRoundCount'],
    ['descending rounds given as a string', { structure: { descendingRounds: 'true' } }, 'structure.descendingRounds'],
    ['a bidding timer under 5 seconds', { turn: { biddingTimerSeconds: 4 } }, 'turn.biddingTimerSeconds'],
    ['a play timer over 180 seconds', { turn: { playTimerSeconds: 181 } }, 'turn.playTimerSeconds'],
    ['a timeout volume above full', { turn: { timeoutSoundVolume: 1.5 } }, 'turn.timeoutSoundVolume'],
    ['an unknown special card', { expansions: { specialCards: ['UNICORN'] } }, 'expansions.specialCards'],
    ['special cards that are not a list', { expansions: { specialCards: CardType.BOMB } }, 'expansions.specialCards'],
  ])('refuses %s instead of repairing it', (_label, change, field) => {
    const errors = errorsOf(rulesWith(change));

    expect(errors).toHaveLength(1);
    expect(errors[0].startsWith(`${field}:`)).toBe(true);
  });

  it('names every invalid field at once', () => {
    const errors = errorsOf(rulesWith({ card: { lastWizardWins: 0 }, scoring: { baseBidPoints: -1 }, turn: { playTimerSeconds: 1 } }));

    expect(errors.map((error) => error.split(':')[0])).toEqual(['card.lastWizardWins', 'scoring.baseBidPoints', 'turn.playTimerSeconds']);
  });

  it.each([
    ['a missing category', (config: Record<string, unknown>) => { delete config.scoring; }, 'scoring'],
    ['a category that is not an object', (config: Record<string, unknown>) => { config.turn = 'fast'; }, 'turn'],
    ['expansions that are not an object', (config: Record<string, unknown>) => { config.expansions = null; }, 'expansions'],
  ])('refuses %s', (_label, mutate, category) => {
    const config = rulesWith({});
    mutate(config);

    expect(errorsOf(config)).toEqual([`${category}: must be an object`]);
  });

  it('reads rules from before expansions existed as the classic deck', () => {
    const config = rulesWith({});
    delete config.expansions;

    const result = validateRulesetConfig(config);

    expect(result.success && result.data.expansions.specialCards).toEqual([]);
  });

  it.each([null, 'classic', 42])('refuses %s as a ruleset', (config) => {
    expect(errorsOf(config)).toEqual(['Ruleset config must be an object']);
  });
});
