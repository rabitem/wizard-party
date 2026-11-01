/**
 * Pointer bookkeeping for hand-card gestures on multi-touch screens.
 *
 * A gesture belongs to the pointer that pressed the card. A resting palm, a second finger or the
 * start of a pinch produces events with other pointer ids; they must neither move nor release
 * (and so play) the dragged card, and must not start a second card gesture alongside it.
 */

/** The press that starts a gesture: a PointerEvent satisfies it. */
export interface GesturePointer {
  pointerId: number;
  target?: EventTarget | null;
}

/** Ids are null for callers that do not report one; such a pointer matches every pointer. */
function isSamePointer(a: number | null, b: number | null): boolean {
  return a === null || b === null || a === b;
}

/** True when `event` belongs to the gesture started by `activePointerId`. */
export function isGesturePointer(activePointerId: number | null, event: { pointerId?: number }): boolean {
  return isSamePointer(activePointerId, event.pointerId ?? null);
}

export interface CardGestureClaim {
  pointerId: number | null;
  /** Ends the gesture as a cancel; called when a newer press of the same pointer takes over. */
  abandon(): void;
}

/**
 * One hand-card gesture at a time across all cards. A press by another pointer while a gesture
 * runs is refused. A press by the holder's own pointer means the holder never saw its release
 * (lost event), so the stale gesture is abandoned and the new press wins.
 */
export class CardGestureLock {
  private holder: CardGestureClaim | null = null;

  claim(claim: CardGestureClaim): boolean {
    const holder = this.holder;
    if (holder && holder !== claim) {
      if (!isSamePointer(holder.pointerId, claim.pointerId)) return false;
      holder.abandon();
    }
    this.holder = claim;
    return true;
  }

  release(claim: CardGestureClaim | null): void {
    if (claim && this.holder === claim) this.holder = null;
  }

  get isHeld(): boolean {
    return this.holder !== null;
  }
}

/** The hand's lock: every Card3D gesture shares it. */
export const cardGestureLock = new CardGestureLock();

/**
 * Captures the pointer on the pressed element (the canvas) so its moves and release keep arriving
 * even over HUD elements. Returns the element and a function that releases the capture, or null
 * when capture was not possible (no element, or a synthetic pointer the browser does not consider
 * active).
 */
export function capturePointer(pointer: GesturePointer): { element: Element; release: () => void } | null {
  const element = pointer.target as unknown as Partial<Element> | null | undefined;
  if (!element || typeof element.setPointerCapture !== 'function') return null;
  try {
    element.setPointerCapture(pointer.pointerId);
  } catch {
    return null;
  }
  const captured = element as Element;
  return {
    element: captured,
    release: () => {
      try {
        if (captured.hasPointerCapture(pointer.pointerId)) captured.releasePointerCapture(pointer.pointerId);
      } catch {
        // The pointer is already gone; nothing is captured any more.
      }
    },
  };
}
