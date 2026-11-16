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
    tracker.step([chip], 500);
    expect(chip.sleep).not.toHaveBeenCalled();
    tracker.step([chip], 200);
    expect(chip.sleep).toHaveBeenCalledOnce();
  });

  it('settles contact stacks whose centres sit slightly below the rendered felt', () => {
    const chip = body();
    chip.translation = () => ({ y: 0.013 });
    new DecorationRestTracker().step([chip], 700);
    expect(chip.sleep).toHaveBeenCalledOnce();
  });

  it('restarts settling after a collision moves or spins a chip', () => {
    for (const motion of ['linear', 'angular']) {
      const tracker = new DecorationRestTracker();
      const chip = body();
      let moving = false;
      chip.linvel = () => ({ x: moving && motion === 'linear' ? 1 : 0, y: 0, z: 0 });
      chip.angvel = () => ({ x: 0, y: moving && motion === 'angular' ? 1 : 0, z: 0 });
      tracker.step([chip], 500);
      moving = true;
      tracker.step([chip], 100);
      moving = false;
      tracker.step([chip], 500);
      expect(chip.sleep).not.toHaveBeenCalled();
      tracker.step([chip], 200);
      expect(chip.sleep).toHaveBeenCalledOnce();
    }
  });

  it('never freezes a decoration that has fallen below the table', () => {
    const chip = body();
    chip.translation = () => ({ y: -2 });
    new DecorationRestTracker().step([chip], 5000);
    expect(chip.sleep).not.toHaveBeenCalled();
  });

  it('settles a stack together instead of sleeping its base while its top is moving', () => {
    const tracker = new DecorationRestTracker();
    const base = body();
    const top = body();
    let moving = true;
    top.angvel = () => ({ x: moving ? 1 : 0, y: 0, z: 0 });
    tracker.step([base, top], 1000);
    expect(base.sleep).not.toHaveBeenCalled();
    expect(top.sleep).not.toHaveBeenCalled();
    moving = false;
    tracker.step([base, top], 500);
    expect(base.sleep).not.toHaveBeenCalled();
    tracker.step([base, top], 200);
    expect(base.sleep).toHaveBeenCalledOnce();
    expect(top.sleep).toHaveBeenCalledOnce();
    moving = true;
    tracker.step([base, top], 100);
    moving = false;
    tracker.step([base, top], 500);
    expect(top.sleep).toHaveBeenCalledOnce();
    tracker.step([base, top], 200);
    expect(top.sleep).toHaveBeenCalledTimes(2);
  });

  it('lets supported props settle without freezing a fallen neighbour', () => {
    const supported = body();
    const fallen = body();
    fallen.translation = () => ({ y: -2 });
    new DecorationRestTracker().step([supported, fallen], 700);
    expect(supported.sleep).toHaveBeenCalledOnce();
    expect(fallen.sleep).not.toHaveBeenCalled();
  });
});
