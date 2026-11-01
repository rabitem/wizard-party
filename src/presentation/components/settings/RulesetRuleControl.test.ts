import { describe, expect, it } from 'vitest';

import { commitNumberInputDraft, getNumberInputDisplayValue } from './RulesetRuleControl';

describe('RulesetRuleControl number input helpers', () => {
  it('keeps display values as typed until the field is committed', () => {
    expect(getNumberInputDisplayValue(null)).toBe('');
    expect(getNumberInputDisplayValue(10)).toBe('10');
  });

  it('clamps numeric drafts only when committing', () => {
    expect(commitNumberInputDraft('1', {
      currentValue: 10,
      min: 5,
      max: 180,
      allowNull: true,
    })).toBe(5);
    expect(commitNumberInputDraft('10', {
      currentValue: 5,
      min: 5,
      max: 180,
      allowNull: true,
    })).toBe(10);
  });

  it('commits empty nullable drafts as disabled timers', () => {
    expect(commitNumberInputDraft('', {
      currentValue: 10,
      min: 5,
      max: 180,
      allowNull: true,
    })).toBeNull();
  });
});
