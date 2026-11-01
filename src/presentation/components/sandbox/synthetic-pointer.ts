import * as THREE from 'three';
import { TABLE_SURFACE } from '../../config/card-physics';
import { visibleHandCardPoint } from './hand-hit-test';
import type { SandboxSceneBridge } from './scene-bridge';
import type { PlayMethod, PointerKind } from './sandbox.types';

type PointerEventType = 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel';
type ResolvedPointer = Exclude<PointerKind, 'auto'>;

interface Point {
  x: number;
  y: number;
}

interface PathStep {
  progress: number;
}

interface GesturePlan {
  /** Pointer positions, one per frame, as fractions of the way from the card to the table centre. */
  path: PathStep[];
  holdFrames: number;
  release?: PointerEventType;
}

/** A second contact during the drag: where it lands and moves (fractions toward the table centre). */
interface SecondContact {
  /** Frame of the primary path on which the second finger lands. */
  atFrame: number;
  path: PathStep[];
}

type GestureMethod = Exclude<PlayMethod, 'command' | 'double-tap'>;

function linear(frames: number, to: number, ease: (value: number) => number = (value) => value, from = 0): PathStep[] {
  return Array.from({ length: frames }, (_, index) => ({ progress: from + ease((index + 1) / frames) * (to - from) }));
}

const easeOut = (value: number) => 1 - (1 - value) ** 3;

/**
 * Pointer gestures, in frames at 60 fps. They exercise the real drag-to-play code:
 * play-zone drops, slow drops (released almost still), flicks (released early but fast,
 * toward the table), cancelled drags that return to the hand, and a drag a second finger
 * interrupts: it lands on the table, moves and lifts while the first finger still holds the
 * card, which the first finger then puts back (the second finger must neither move nor drop it).
 */
const GESTURES: Record<GestureMethod, GesturePlan> = {
  'drag-throw': { path: linear(12, 1), holdFrames: 0 },
  'drag-slow': { path: linear(45, 1, easeOut), holdFrames: 12 },
  flick: { path: linear(5, 0.45), holdFrames: 0 },
  'drag-interrupt': { path: linear(14, 0.6), holdFrames: 0, release: 'pointercancel' },
  'drag-cancel': {
    path: [...linear(10, 0.18), ...linear(10, 0.18).reverse().map(({ progress }) => ({ progress: progress - 0.18 }))],
    holdFrames: 4,
  },
  // Out to 0.2, held there while the second finger lands, moves and lifts, then back onto the hand.
  'drag-second-finger': { path: [...linear(10, 0.2), ...linear(16, 0.2, undefined, 0.2), ...linear(10, 0, undefined, 0.2)], holdFrames: 6 },
};

const SECOND_CONTACTS: Partial<Record<GestureMethod, SecondContact>> = {
  'drag-second-finger': { atFrame: 10, path: [{ progress: 0.9 }, ...linear(12, 1.1, undefined, 0.9)] },
};

/** Touch contacts are fingers: pointer ids above the mouse's, and a contact patch. */
const TOUCH_POINTER_BASE_ID = 2;
const TOUCH_CONTACT_PX = 18;

/** 'auto' follows the device: a coarse primary pointer (phones, tablets) means touch. */
export function resolvePointerKind(kind: PointerKind): ResolvedPointer {
  if (kind !== 'auto') return kind;
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 'touch' : 'mouse';
}

interface Contact {
  kind: ResolvedPointer;
  /** 0 for the first contact, 1 for a second finger. */
  index: number;
}

let captureShimInstalled = false;

/**
 * Synthetic pointers are never active pointers, so the browser throws NotFoundError when page code
 * (OrbitControls on its document pointerup) captures or releases one. A real pointer is active
 * while its events are dispatched; in the sandbox page those calls are no-ops instead, so the
 * report shows the game's errors, not artefacts of the driver.
 */
function installSyntheticCaptureShim(): void {
  if (captureShimInstalled || typeof Element === 'undefined') return;
  captureShimInstalled = true;
  for (const method of ['setPointerCapture', 'releasePointerCapture'] as const) {
    const native = Element.prototype[method];
    Element.prototype[method] = function captureIgnoringInactivePointers(this: Element, pointerId: number) {
      try {
        native.call(this, pointerId);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'NotFoundError')) throw error;
      }
    };
  }
}

/**
 * R3F hit-tests with offsetX/offsetY. For untrusted events Chromium derives them from the client
 * point in device pixels on scaled displays (offsetX = clientX / devicePixelRatio at 150% Windows
 * scaling), so a synthetic tap would miss the card it aims at. Pin them to the target's box.
 */
function withTargetOffset(event: PointerEvent, target: EventTarget, point: Point): PointerEvent {
  if (!(target instanceof Element)) return event;
  const box = target.getBoundingClientRect();
  return Object.defineProperties(event, {
    offsetX: { value: point.x - box.left },
    offsetY: { value: point.y - box.top },
  });
}

function dispatch(target: EventTarget, type: PointerEventType, point: Point, contact: Contact): void {
  const touch = contact.kind === 'touch';
  const pressed = type === 'pointerdown' || type === 'pointermove';
  installSyntheticCaptureShim();
  target.dispatchEvent(withTargetOffset(new PointerEvent(type, {
    clientX: point.x,
    clientY: point.y,
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: touch ? TOUCH_POINTER_BASE_ID + contact.index : 1,
    pointerType: contact.kind,
    isPrimary: contact.index === 0,
    button: type === 'pointermove' ? -1 : 0,
    buttons: pressed ? 1 : 0,
    width: touch ? TOUCH_CONTACT_PX : 1,
    height: touch ? TOUCH_CONTACT_PX : 1,
    pressure: pressed ? 0.5 : 0,
  }), target, point));
}

/** Where a finger or the mouse lands on a hand card: on the part of it the player can see. */
export function cardClientPoint(bridge: SandboxSceneBridge, cardId: string): Point | null {
  return visibleHandCardPoint(bridge, cardId);
}

export function tableCentrePoint(bridge: SandboxSceneBridge): Point {
  return bridge.projectToClient(new THREE.Vector3(0, TABLE_SURFACE.CARD_REST_Y, 0));
}

/** Two taps inside the double-tap window, as a touch player would. */
export async function doubleTap(
  bridge: SandboxSceneBridge,
  cardId: string,
  kind: ResolvedPointer,
  timing: { nextFrame: () => Promise<void>; pause: () => Promise<void> }
): Promise<boolean> {
  const contact: Contact = { kind, index: 0 };
  for (let tap = 0; tap < 2; tap++) {
    if (tap > 0) await timing.pause();
    const point = cardClientPoint(bridge, cardId);
    if (!point) return false;
    dispatch(bridge.canvas, 'pointerdown', point, contact);
    await timing.nextFrame();
    dispatch(bridge.canvas, 'pointerup', point, contact);
    await timing.nextFrame();
  }
  return true;
}

export async function performGesture(
  bridge: SandboxSceneBridge,
  cardId: string,
  method: GestureMethod,
  kind: ResolvedPointer,
  nextFrame: () => Promise<void>
): Promise<boolean> {
  const start = cardClientPoint(bridge, cardId);
  if (!start) return false;
  const target = tableCentrePoint(bridge);
  const plan = GESTURES[method];
  const at = (progress: number): Point => ({
    x: start.x + (target.x - start.x) * progress,
    y: start.y + (target.y - start.y) * progress,
  });
  const primary: Contact = { kind, index: 0 };
  // A second finger is a touch by definition, whatever pointer drives the first contact.
  const secondary: Contact = { kind: 'touch', index: 1 };
  const second = SECOND_CONTACTS[method];

  dispatch(bridge.canvas, 'pointerdown', start, primary);
  await nextFrame();

  let last = start;
  for (const [frame, step] of plan.path.entries()) {
    last = at(step.progress);
    dispatch(bridge.canvas, 'pointermove', last, primary);
    const secondStep = second ? frame - second.atFrame : -1;
    if (second && secondStep >= 0 && secondStep <= second.path.length) {
      const index = Math.min(secondStep, second.path.length - 1);
      const type: PointerEventType = secondStep === 0 ? 'pointerdown' : secondStep === second.path.length ? 'pointerup' : 'pointermove';
      dispatch(bridge.canvas, type, at(second.path[index].progress), secondary);
    }
    await nextFrame();
  }
  for (let frame = 0; frame < plan.holdFrames; frame++) {
    dispatch(bridge.canvas, 'pointermove', last, primary);
    await nextFrame();
  }

  dispatch(bridge.canvas, plan.release ?? 'pointerup', last, primary);
  await nextFrame();
  return true;
}
