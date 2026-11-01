import { describe, expect, it, vi, type Mock } from 'vitest';

import { CardGestureLock, capturePointer, isGesturePointer, type CardGestureClaim } from './card-gesture-pointer';

function claim(pointerId: number | null): CardGestureClaim & { abandon: Mock<() => void> } {
  return { pointerId, abandon: vi.fn<() => void>() };
}

describe('isGesturePointer', () => {
  it('follows only the pointer that pressed the card', () => {
    expect(isGesturePointer(7, { pointerId: 7 })).toBe(true);
    expect(isGesturePointer(7, { pointerId: 8 })).toBe(false);
  });

  it('accepts every pointer when the press did not report one', () => {
    expect(isGesturePointer(null, { pointerId: 8 })).toBe(true);
    expect(isGesturePointer(7, {})).toBe(true);
  });
});

describe('CardGestureLock', () => {
  it('refuses a second finger while a gesture runs', () => {
    const lock = new CardGestureLock();
    const first = claim(1);
    const second = claim(2);

    expect(lock.claim(first)).toBe(true);
    expect(lock.claim(second)).toBe(false);
    expect(first.abandon).not.toHaveBeenCalled();
  });

  it('lets the next gesture start once the first released', () => {
    const lock = new CardGestureLock();
    const first = claim(1);
    lock.claim(first);
    lock.release(first);

    expect(lock.isHeld).toBe(false);
    expect(lock.claim(claim(2))).toBe(true);
  });

  it('abandons a stale gesture when its own pointer presses again', () => {
    const lock = new CardGestureLock();
    const stale = claim(1);
    lock.claim(stale);
    stale.abandon.mockImplementation(() => lock.release(stale));

    const fresh = claim(1);
    expect(lock.claim(fresh)).toBe(true);
    expect(stale.abandon).toHaveBeenCalledOnce();

    expect(lock.claim(claim(2))).toBe(false);
  });

  it('ignores the release of a claim that no longer holds the lock', () => {
    const lock = new CardGestureLock();
    const stale = claim(null);
    lock.claim(stale);
    const fresh = claim(3);
    lock.claim(fresh);

    lock.release(stale);
    lock.release(null);

    expect(lock.isHeld).toBe(true);
  });
});

describe('capturePointer', () => {
  function element(options: { throws?: boolean } = {}) {
    let captured: number | null = null;
    return {
      setPointerCapture: vi.fn((id: number) => {
        if (options.throws) throw new DOMException('No active pointer', 'NotFoundError');
        captured = id;
      }),
      hasPointerCapture: vi.fn((id: number) => captured === id),
      releasePointerCapture: vi.fn(() => {
        captured = null;
      }),
    };
  }

  it('captures the pointer and releases it on demand', () => {
    const target = element();
    const capture = capturePointer({ pointerId: 4, target: target as unknown as EventTarget });

    expect(target.setPointerCapture).toHaveBeenCalledWith(4);
    capture?.release();
    expect(target.releasePointerCapture).toHaveBeenCalledWith(4);
    capture?.release();
    expect(target.releasePointerCapture).toHaveBeenCalledOnce();
  });

  it('returns null for synthetic pointers the browser does not consider active', () => {
    const target = element({ throws: true });
    expect(capturePointer({ pointerId: 4, target: target as unknown as EventTarget })).toBeNull();
  });

  it('returns null without a capturable target', () => {
    expect(capturePointer({ pointerId: 4, target: null })).toBeNull();
    expect(capturePointer({ pointerId: 4, target: {} as EventTarget })).toBeNull();
  });
});
