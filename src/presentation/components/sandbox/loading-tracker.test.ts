import { describe, expect, it } from 'vitest';
import { LoadingTracker } from './loading-tracker';

function manager() {
  const seen: string[] = [];
  return {
    seen,
    itemStart: (url: string) => {
      seen.push(`start:${url}`);
    },
    itemEnd: (url: string) => {
      seen.push(`end:${url}`);
    },
  };
}

describe('LoadingTracker', () => {
  it('should count loads in flight and keep the manager working', () => {
    const target = manager();
    const tracker = new LoadingTracker(target);
    target.itemStart('felt.jpg');
    target.itemStart('room.hdr');
    target.itemEnd('felt.jpg');
    expect(tracker.pendingLoads).toBe(1);
    target.itemEnd('room.hdr');
    target.itemEnd('stray.png');
    expect(tracker.pendingLoads).toBe(0);
    expect(target.seen).toEqual(['start:felt.jpg', 'start:room.hdr', 'end:felt.jpg', 'end:room.hdr', 'end:stray.png']);
  });

  it('should not let a load that started before it was installed cancel a tracked one', () => {
    const target = manager();
    const tracker = new LoadingTracker(target);
    target.itemStart('felt.jpg');
    // room.hdr started before the tracker existed; its end must not settle felt.jpg.
    target.itemEnd('room.hdr');
    expect(tracker.pendingLoads).toBe(1);
    target.itemEnd('felt.jpg');
    expect(tracker.pendingLoads).toBe(0);
  });

  it('should count repeated loads of the same URL separately', () => {
    const target = manager();
    const tracker = new LoadingTracker(target);
    target.itemStart('card.png');
    target.itemStart('card.png');
    target.itemEnd('card.png');
    expect(tracker.pendingLoads).toBe(1);
    target.itemEnd('card.png');
    expect(tracker.pendingLoads).toBe(0);
  });

  it('should restore the manager on dispose', () => {
    const target = manager();
    const { itemStart, itemEnd } = target;
    new LoadingTracker(target).dispose();
    expect(target.itemStart).toBe(itemStart);
    expect(target.itemEnd).toBe(itemEnd);
  });
});
