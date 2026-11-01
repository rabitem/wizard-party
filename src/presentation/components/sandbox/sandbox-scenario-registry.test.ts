import { describe, expect, it } from 'vitest';
import { ALL_SCENARIOS, resolveScenario } from './sandbox-scenario-registry';
import { buildSandboxTable } from './sandbox-run-support';
import type { SandboxStep } from './sandbox.types';

function flatten(steps: readonly SandboxStep[]): SandboxStep[] {
  return steps.flatMap((step) => (step.op === 'repeat' ? [step, ...flatten(step.steps)] : [step]));
}

describe('scenario registry', () => {
  it('should give every scenario a unique id', () => {
    const ids = ALL_SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should refuse an unknown scenario id', () => {
    expect(() => resolveScenario('no-such-scenario')).toThrow(/Unknown scenario/);
  });

  it('should close every measurement window it opens', () => {
    for (const scenario of ALL_SCENARIOS) {
      const steps = flatten(scenario.steps);
      const opened = steps.filter((step) => step.op === 'measure-start').map((step) => (step as { label: string }).label);
      const closed = steps.filter((step) => step.op === 'measure-end').map((step) => (step as { label: string }).label);
      expect(closed.sort(), scenario.id).toEqual(opened.sort());
    }
  });
});

describe('table rounds', () => {
  it('should build the max-hand table at the bidding phase', () => {
    const scenario = resolveScenario('max-hand');
    const table = buildSandboxTable({ scenario: 'max-hand', playerCount: 5 }, scenario);
    expect(table).toMatchObject({ playerCount: 5, round: 12, startPhase: 'BIDDING' });
  });
});
