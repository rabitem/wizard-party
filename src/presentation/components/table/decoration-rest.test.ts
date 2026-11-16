import { describe, expect, it, vi } from 'vitest';
import { DecorationRestTracker } from './decoration-rest';

function body() {
  return { isSleeping: () => false, linvel: () => ({ x: 0, y: 0.01, z: 0 }),
    angvel: () => ({ x: 0, y: 0, z: 0 }), translation: () => ({ y: 0.03 }), sleep: vi.fn() };
}

describe('DecorationRestTracker', () => {
  it('sleeps a chip after sustained contact jitter, not at its first quiet instant', () => {
    const tracker = new DecorationRestTracker();
    const chip = body();
    tracker.step(chip, 500);
    expect(chip.sleep).not.toHaveBeenCalled();
    tracker.step(chip, 200);
    expect(chip.sleep).toHaveBeenCalledOnce();
  });

  it('restarts settling after a collision moves or spins a chip', () => {
    for (const motion of ['linear', 'angular']) {
      const tracker = new DecorationRestTracker();
      const chip = body();
      let moving = false;
      chip.linvel = () => ({ x: moving && motion === 'linear' ? 1 : 0, y: 0, z: 0 });
      chip.angvel = () => ({ x: 0, y: moving && motion === 'angular' ? 1 : 0, z: 0 });
      tracker.step(chip, 500);
      moving = true;
      tracker.step(chip, 100);
      moving = false;
      tracker.step(chip, 500);
      expect(chip.sleep).not.toHaveBeenCalled();
      tracker.step(chip, 200);
      expect(chip.sleep).toHaveBeenCalledOnce();
    }
  });

  it('never freezes a decoration that has fallen below the felt', () => {
    const chip = body();
    chip.translation = () => ({ y: -1 });
    new DecorationRestTracker().step(chip, 5000);
    expect(chip.sleep).not.toHaveBeenCalled();
  });

  it('tracks each body independently and resumes settling after a sleeping chip wakes', () => {
    const tracker = new DecorationRestTracker();
    const first = body();
    const second = body();
    tracker.step(first, 500);
    tracker.step(second, 200);
    tracker.step(first, 200);
    expect(first.sleep).toHaveBeenCalledOnce();
    expect(second.sleep).not.toHaveBeenCalled();
    let sleeping = true;
    first.isSleeping = () => sleeping;
    tracker.step(first, 5000);
    sleeping = false;
    tracker.step(first, 500);
    expect(first.sleep).toHaveBeenCalledOnce();
    tracker.step(first, 200);
    expect(first.sleep).toHaveBeenCalledTimes(2);
  });
});
