import { describe, expect, it } from 'vitest';
import { IDLE_TRICK_WIN_BURST, stepTrickWinBurst, type TrickWinBurstState } from './trick-win-burst';

const DURATION = 1.5;

function run(frames: Array<{ active: boolean; now: number }>) {
  let state: TrickWinBurstState = IDLE_TRICK_WIN_BURST;
  return frames.map(({ active, now }) => {
    const step = stepTrickWinBurst(state, active, now, DURATION);
    state = step.state;
    return step;
  });
}

describe('stepTrickWinBurst', () => {
  it('stays hidden until the first trick win', () => {
    const steps = run([{ active: false, now: 0 }, { active: false, now: 1 }]);
    expect(steps.every((step) => !step.state.animating && !step.completed)).toBe(true);
  });

  it('starts on the rising edge and runs from elapsed 0', () => {
    const [idle, start, mid] = run([
      { active: false, now: 2 },
      { active: true, now: 3 },
      { active: true, now: 3.75 },
    ]);
    expect(idle.state.animating).toBe(false);
    expect(start).toMatchObject({ elapsed: 0, progress: 0, completed: false });
    expect(start.state.animating).toBe(true);
    expect(mid.progress).toBeCloseTo(0.5, 9);
  });

  it('completes once and hides again after the duration', () => {
    const steps = run([
      { active: true, now: 0 },
      { active: true, now: 1.6 },
      { active: true, now: 1.7 },
    ]);
    expect(steps[1].completed).toBe(true);
    expect(steps[1].state.animating).toBe(false);
    expect(steps[2]).toMatchObject({ completed: false, state: { animating: false } });
  });

  it('needs active to drop before it can burst again', () => {
    const steps = run([
      { active: true, now: 0 },
      { active: true, now: 2 },
      { active: false, now: 2.1 },
      { active: true, now: 2.2 },
    ]);
    expect(steps[3].state.animating).toBe(true);
    expect(steps[3].state.startTime).toBe(2.2);
  });
});
