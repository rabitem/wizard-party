import { describe, expect, it } from 'vitest';

import { DEFAULT_RULESET_CONFIG, ensureRulesetConfig } from './ruleset-config';
import { countNonDefaultRules } from './ruleset-validation';

describe('ensureRulesetConfig', () => {
  it('normalizes invalid persisted or client-provided rule values to defaults', () => {
    const config = ensureRulesetConfig({
      card: {
        lastWizardWins: 'yes',
        lastJesterWins: true,
      },
      bidding: {
        hiddenBids: 1,
        allowEqualBids: true,
      },
      scoring: {
        baseBidPoints: 35,
        pointsPerTrick: Number.POSITIVE_INFINITY,
        penaltyPerMiss: -1,
      },
      structure: {
        customRoundCount: 200,
        descendingRounds: 'false',
      },
    });

    expect(config).toEqual({
      card: {
        lastWizardWins: DEFAULT_RULESET_CONFIG.card.lastWizardWins,
        lastJesterWins: true,
      },
      bidding: {
        hiddenBids: DEFAULT_RULESET_CONFIG.bidding.hiddenBids,
        allowEqualBids: true,
      },
      scoring: {
        baseBidPoints: 35,
        pointsPerTrick: DEFAULT_RULESET_CONFIG.scoring.pointsPerTrick,
        penaltyPerMiss: DEFAULT_RULESET_CONFIG.scoring.penaltyPerMiss,
      },
      structure: {
        customRoundCount: DEFAULT_RULESET_CONFIG.structure.customRoundCount,
        descendingRounds: DEFAULT_RULESET_CONFIG.structure.descendingRounds,
      },
      turn: {
        biddingTimerSeconds: DEFAULT_RULESET_CONFIG.turn.biddingTimerSeconds,
        playTimerSeconds: DEFAULT_RULESET_CONFIG.turn.playTimerSeconds,
        timeoutSoundVolume: DEFAULT_RULESET_CONFIG.turn.timeoutSoundVolume,
      },
      expansions: {
        specialCards: [],
      },
    });
  });

  it('lets non-default helpers read configs that omit turn rules', () => {
    const partialConfig = {
      card: {
        lastWizardWins: true,
        lastJesterWins: DEFAULT_RULESET_CONFIG.card.lastJesterWins,
      },
      bidding: { ...DEFAULT_RULESET_CONFIG.bidding },
      scoring: { ...DEFAULT_RULESET_CONFIG.scoring },
      structure: { ...DEFAULT_RULESET_CONFIG.structure },
    };

    expect(countNonDefaultRules(partialConfig)).toBe(1);
  });

  it('normalizes split timer fields and only counts timeout sound volume while a timer is enabled', () => {
    const enabledTimerConfig = ensureRulesetConfig({
      turn: {
        biddingTimerSeconds: 8,
        playTimerSeconds: 5,
        timeoutSoundVolume: 0.4,
      },
    });

    expect(enabledTimerConfig.turn).toEqual({
      biddingTimerSeconds: 8,
      playTimerSeconds: 5,
      timeoutSoundVolume: 0.4,
    });
    expect(countNonDefaultRules(enabledTimerConfig)).toBe(3);

    const disabledTimerConfig = ensureRulesetConfig({
      turn: {
        biddingTimerSeconds: null,
        playTimerSeconds: null,
        timeoutSoundVolume: 0.4,
      },
    });

    expect(countNonDefaultRules(disabledTimerConfig)).toBe(0);
  });

  it('derives bidding timer from play timer when bidding is omitted', () => {
    expect(ensureRulesetConfig({
      turn: {
        playTimerSeconds: 10,
      },
    }).turn).toEqual({
      biddingTimerSeconds: 15,
      playTimerSeconds: 10,
      timeoutSoundVolume: DEFAULT_RULESET_CONFIG.turn.timeoutSoundVolume,
    });
  });

  it('falls back to full timeout sound volume for invalid or missing values', () => {
    const missingVolumeConfig = ensureRulesetConfig({
      turn: {
        biddingTimerSeconds: 8,
        playTimerSeconds: 5,
      },
    });
    const invalidConfig = ensureRulesetConfig({
      turn: {
        biddingTimerSeconds: 8,
        playTimerSeconds: 5,
        timeoutSoundVolume: 2,
      },
    });

    expect(missingVolumeConfig.turn.timeoutSoundVolume).toBe(DEFAULT_RULESET_CONFIG.turn.timeoutSoundVolume);
    expect(invalidConfig.turn.timeoutSoundVolume).toBe(DEFAULT_RULESET_CONFIG.turn.timeoutSoundVolume);
  });
});
