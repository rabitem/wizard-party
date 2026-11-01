import { describe, expect, it } from 'vitest';
import { SandboxHoldGate, type SandboxHold } from './sandbox-hold';

function gate() {
  const changes: Array<SandboxHold | null> = [];
  const holds = new SandboxHoldGate((hold) => changes.push(hold));
  return { holds, changes };
}

const never = new Promise<void>(() => {});

describe('SandboxHoldGate', () => {
  it('should park a run until the driver releases it', async () => {
    const { holds, changes } = gate();
    const released = holds.hold({ kind: 'snapshot', label: 'room-default' }, never);
    expect(holds.current).toEqual({ kind: 'snapshot', label: 'room-default' });
    expect(holds.release()).toBe(true);
    await expect(released).resolves.toBe(true);
    expect(holds.current).toBeNull();
    expect(changes).toEqual([{ kind: 'snapshot', label: 'room-default' }, null]);
  });

  it('should only release a hold of the given label', () => {
    const { holds } = gate();
    void holds.hold({ kind: 'external', label: 'touch-play' }, never);
    expect(holds.release('other')).toBe(false);
    expect(holds.release('touch-play')).toBe(true);
    expect(holds.release()).toBe(false);
  });

  it('should give up when the timeout settles first', async () => {
    const { holds } = gate();
    let expire: () => void = () => {};
    const timeout = new Promise<void>((resolve) => {
      expire = resolve;
    });
    const released = holds.hold({ kind: 'snapshot', label: 'a' }, timeout);
    expire();
    await expect(released).resolves.toBe(false);
    expect(holds.current).toBeNull();
  });

  it('should not let an old timeout end a newer hold with the same label', async () => {
    const { holds } = gate();
    let expireFirst: () => void = () => {};
    const first = holds.hold({ kind: 'snapshot', label: 'same' }, new Promise<void>((resolve) => {
      expireFirst = resolve;
    }));
    holds.release();
    await first;
    const second = holds.hold({ kind: 'snapshot', label: 'same' }, never);
    expireFirst();
    await Promise.resolve();
    expect(holds.current).toEqual({ kind: 'snapshot', label: 'same' });
    holds.cancel();
    await expect(second).resolves.toBe(false);
  });
});
