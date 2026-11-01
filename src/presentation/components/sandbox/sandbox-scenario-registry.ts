import {
  IDLE_TABLE_SCENARIO,
  PLAYABILITY_SCENARIOS,
  RENDER_BUDGET_SCENARIO_DEFINITION,
  ROOM_TOUR_SCENARIO,
} from './sandbox-scenarios-capture';
import { FAULT_SCENARIOS } from './sandbox-scenarios-faults';
import { PERF_ROUND_SCENARIO, SANDBOX_SCENARIOS, THEME_SWEEP_SCENARIO } from './sandbox-scenarios';
import type { SandboxScenario } from './sandbox.types';

/**
 * Every scenario the sandbox can run, by group. Short correctness scenarios come first; the
 * long ones (theme sweep, measured rounds, the visual tour) last, since they usually run alone.
 */
export const SCENARIO_GROUPS = {
  animation: SANDBOX_SCENARIOS,
  faults: FAULT_SCENARIOS,
  playability: PLAYABILITY_SCENARIOS,
  long: [THEME_SWEEP_SCENARIO, PERF_ROUND_SCENARIO, RENDER_BUDGET_SCENARIO_DEFINITION, IDLE_TABLE_SCENARIO, ROOM_TOUR_SCENARIO],
} as const satisfies Record<string, readonly SandboxScenario[]>;

export const ALL_SCENARIOS: readonly SandboxScenario[] = Object.values(SCENARIO_GROUPS).flat();

function findScenario(id: string): SandboxScenario | undefined {
  return ALL_SCENARIOS.find((scenario) => scenario.id === id);
}

/** A scenario given inline or by id; throws for an unknown id. */
export function resolveScenario(scenario: string | SandboxScenario): SandboxScenario {
  if (typeof scenario !== 'string') return scenario;
  const found = findScenario(scenario);
  if (!found) throw new Error(`Unknown scenario "${scenario}"`);
  return found;
}
