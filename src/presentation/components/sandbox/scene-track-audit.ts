import { TABLE_SURFACE } from '../../config/card-physics';
import { SANDBOX_AUDIT } from '../../config/sandbox.config';
import type { SceneObjectKind } from '../three/scene-object-names';
import { distance, round, roundVec, type AuditLog } from './audit-log';
import type { NdcBounds, ObjectSample, Vec3 } from './sandbox.types';

/** Which owner a card comes from when it appears as `kind`. */
const HANDOFF_PREDECESSORS: Partial<Record<SceneObjectKind, SceneObjectKind[]>> = {
  'played-card': ['dragged-card', 'hand-card'],
  'collecting-card': ['played-card'],
  'deck-card': ['collecting-card'],
};

export const TABLE_KINDS = new Set<SceneObjectKind>(['played-card', 'collecting-card', 'deck-card']);

/** Objects whose motion is scripted animation (not pointer input or camera space). */
const SCRIPTED_KINDS = new Set<SceneObjectKind>(['played-card', 'collecting-card']);

/** Owners whose departure is remembered until the card shows up on the table, however long that takes. */
const PERSISTENT_PREDECESSORS = new Set<SceneObjectKind>(['hand-card', 'dragged-card']);

/**
 * The space a card's motion is judged in. Hand cards ride on the camera, so world distance says
 * little; they are judged by where they appear on screen (centre and size of their projection).
 */
function motionOf(sample: ObjectSample): Vec3 {
  if (sample.kind !== 'hand-card') return sample.position;
  if (!sample.ndc) return sample.cameraPosition;
  const { minX, maxX, minY, maxY } = sample.ndc;
  return [(minX + maxX) / 2, (minY + maxY) / 2, Math.max(maxX - minX, maxY - minY)];
}

function difference(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function length(vec: Vec3): number {
  return Math.hypot(vec[0], vec[1], vec[2]);
}

/** True when `current` differs from `previous` by more than MOTION_BREAK_RATIO of itself. */
function isBreak(current: Vec3, previous: Vec3 | null): boolean {
  const size = length(current);
  return size > 0 && (!previous || length(difference(current, previous)) > SANDBOX_AUDIT.MOTION_BREAK_RATIO * size);
}

function angleBetween(a: TrackSample['quaternion'], b: TrackSample['quaternion']): number {
  const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, dot));
}

interface TrackSample {
  t: number;
  frame: number;
  position: Vec3;
  quaternion: [number, number, number, number];
  /** Motion frame for teleport checks: world space, or camera space for camera-parented hand cards. */
  motion: Vec3;
  visible: boolean;
}

export interface Track {
  name: string;
  kind: SceneObjectKind;
  cardId: string;
  last: TrackSample;
  /** World units per second over the last frame. */
  speed: number;
  /** Rotation over the last frame, radians. */
  spin: number;
  /** Frames sampled since mount. */
  age: number;
  history: TrackSample[];
}

interface Unmount {
  name: string;
  kind: SceneObjectKind;
  cardId: string;
  t: number;
  frame: number;
  position: Vec3;
}

export interface FrameContext {
  handAnimating: boolean;
  camera?: Vec3;
}

export interface SceneTrackHooks {
  onMount(t: number, sample: ObjectSample): void;
  onUnmount(t: number, track: Track): void;
  isPlayedCardAnimating(cardId: string): boolean;
}

/** Share of a card's projected extent that lies outside the viewport (0 = fully visible). */
function hiddenFraction(ndc: NdcBounds): number {
  const limit = 1 + SANDBOX_AUDIT.OFFSCREEN_NDC_TOLERANCE;
  const axisHidden = (min: number, max: number) => {
    const size = Math.max(max - min, 1e-6);
    const visible = Math.max(0, Math.min(max, limit) - Math.max(min, -limit));
    return 1 - visible / size;
  };
  return Math.max(axisHidden(ndc.minX, ndc.maxX), axisHidden(ndc.minY, ndc.maxY));
}

/**
 * Follows every named card object frame by frame and checks what one object can get wrong
 * on its own: non-finite or teleporting transforms, sinking through the felt, leaving the
 * viewport, flickering, and seams when a card passes from one owner to the next.
 */
export class SceneTrackAudit {
  private readonly tracks = new Map<string, Track>();
  private recentUnmounts: Unmount[] = [];
  /** Tracks that unmount in the frame being judged (their objects left the scene this frame). */
  private departing = new Set<string>();
  private readonly doubleRenderFrames = new Map<string, number>();
  private lastCamera: Vec3 | null = null;
  private lastT: number | null = null;
  /**
   * Per-object checks start once the scene finished loading; before that only mounts are
   * tracked (the hand is still being laid out and the camera framed).
   */
  ready = false;
  /**
   * Frame-to-frame motion checks (teleports, kinks, rotation pops, handoff seams, camera cuts).
   * Off when the probe samples only every Nth frame (perf mode): steps over N frames are not motion
   * bugs. Presence, end-state and on-screen checks still run.
   */
  motionChecks = true;

  constructor(private readonly audit: AuditLog, private readonly hooks: SceneTrackHooks) {}

  present(kind?: SceneObjectKind): Track[] {
    return [...this.tracks.values()].filter((track) => !kind || track.kind === kind);
  }

  /**
   * Like present, without the objects that leave the scene in the frame being judged: a card that
   * mounts in the frame the previous trick's collected cards unmount did not overlap them.
   */
  remaining(kind?: SceneObjectKind): Track[] {
    return this.present(kind).filter((track) => !this.departing.has(track.name));
  }

  isTableMoving(): boolean {
    return this.present().some((track) => TABLE_KINDS.has(track.kind) && track.speed > SANDBOX_AUDIT.SETTLED_MAX_SPEED_UNITS_PER_S);
  }

  frame(t: number, samples: ObjectSample[], context: FrameContext): void {
    const dt = Math.max(t - (this.lastT ?? t), 1e-3);
    this.lastT = t;
    if (context.camera) this.checkCamera(t, context.camera);

    const seen = new Set(samples.map((sample) => sample.name));
    this.departing = new Set([...this.tracks.keys()].filter((name) => !seen.has(name)));
    for (const sample of samples) {
      const track = this.tracks.get(sample.name);
      if (track) this.update(t, dt, track, sample, context);
      else this.mount(t, sample);
    }
    for (const track of [...this.tracks.values()]) if (!seen.has(track.name)) this.unmount(t, track);
    this.departing.clear();

    this.checkDoubleRender(t, samples);
    this.recentUnmounts = this.recentUnmounts.filter(
      (entry) => PERSISTENT_PREDECESSORS.has(entry.kind) || t - entry.t <= SANDBOX_AUDIT.HANDOFF_WINDOW_MS
    );
  }

  /**
   * Frames went undrawn (a lost WebGL context): the next drawn frame follows the last one the
   * player saw, so frame-to-frame checks start over from it instead of reading the gap as a jump.
   */
  breakContinuity(): void {
    for (const track of this.tracks.values()) track.history = [];
  }

  /** The whole scene unmounted (game end, disconnect overlay); forget its objects without judging them. */
  clear(): void {
    this.tracks.clear();
    this.recentUnmounts = [];
    this.doubleRenderFrames.clear();
    this.lastCamera = null;
    this.lastT = null;
  }

  private checkCamera(t: number, camera: Vec3): void {
    const previous = this.lastCamera;
    this.lastCamera = camera;
    if (!previous || !this.judgesMotion) return;
    const step = distance(previous, camera);
    if (step > SANDBOX_AUDIT.MAX_CAMERA_STEP) {
      this.audit.flag(t, 'camera-jump', `Camera jumped ${round(step)} units in one frame`, 'camera', { from: roundVec(previous), to: roundVec(camera) });
    }
  }

  private sampleOf(t: number, sample: ObjectSample): TrackSample {
    return {
      t,
      frame: this.audit.frame,
      position: sample.position,
      quaternion: sample.quaternion,
      motion: motionOf(sample),
      visible: sample.visible,
    };
  }

  private mount(t: number, sample: ObjectSample): void {
    const first = this.sampleOf(t, sample);
    this.tracks.set(sample.name, { name: sample.name, kind: sample.kind, cardId: sample.cardId, last: first, speed: 0, spin: 0, age: 0, history: [first] });
    this.audit.log(t, 'mount', sample.name, { position: roundVec(sample.position) });

    if (!sample.finite) this.audit.flag(t, 'non-finite-transform', `${sample.name} mounted with a non-finite transform`, sample.name);

    const remount = this.recentUnmounts.find((entry) => entry.name === sample.name);
    if (remount && t - remount.t <= SANDBOX_AUDIT.REMOUNT_FLICKER_WINDOW_MS) {
      this.audit.flag(t, 'remount-flicker', `${sample.name} unmounted and remounted after ${round(t - remount.t, 1)}ms`, sample.name);
    }

    if (this.judgesMotion) this.checkHandoff(t, sample);
    // The card arrived somewhere; older departures of it are settled.
    this.recentUnmounts = this.recentUnmounts.filter((entry) => entry.cardId !== sample.cardId || entry.name === sample.name);
    this.hooks.onMount(t, sample);
  }

  private previousOwner(t: number, sample: ObjectSample) {
    const predecessors = HANDOFF_PREDECESSORS[sample.kind];
    if (!predecessors) return null;
    // A hidden owner (the hand card while its dragged copy is shown) is not what the player saw last.
    const live = this.present().find((track) =>
      track.name !== sample.name && track.cardId === sample.cardId && predecessors.includes(track.kind) && track.last.visible
    );
    if (live) return { kind: live.kind, position: live.last.position, gapFrames: 0, gapMs: 0 };
    const departed = [...this.recentUnmounts].reverse().find((entry) => entry.cardId === sample.cardId && predecessors.includes(entry.kind));
    if (!departed) return null;
    return { kind: departed.kind, position: departed.position, gapFrames: this.audit.frame - departed.frame, gapMs: t - departed.t };
  }

  private checkHandoff(t: number, sample: ObjectSample): void {
    const previous = this.previousOwner(t, sample);
    if (!previous) return;
    const subject = `${previous.kind}->${sample.kind}:${sample.cardId}`;

    // Hand cards live in camera space, so only the timing of a hand -> table handoff is comparable.
    const tolerance = sample.kind === 'played-card' ? SANDBOX_AUDIT.HAND_HANDOFF_TOLERANCE : SANDBOX_AUDIT.HANDOFF_TOLERANCE;
    const jump = previous.kind === 'hand-card' ? 0 : distance(previous.position, sample.position);
    if (jump > tolerance) {
      this.audit.flag(t, 'handoff-pop', `${sample.cardId} jumped ${round(jump)} units moving from ${previous.kind} to ${sample.kind}`, subject, {
        from: roundVec(previous.position),
        to: roundVec(sample.position),
        jump: round(jump),
      });
    }
    // gapFrames counts frames drawn with neither owner; mounting on the frame the old owner left is seamless.
    if (previous.gapFrames > SANDBOX_AUDIT.HANDOFF_MAX_GAP_FRAMES) {
      this.audit.flag(t, 'handoff-gap', `${sample.cardId} was invisible for ${previous.gapFrames} frame(s) (${round(previous.gapMs, 1)}ms) between ${previous.kind} and ${sample.kind}`, subject, {
        gapFrames: previous.gapFrames,
        gapMs: round(previous.gapMs, 1),
      });
    }
  }

  private update(t: number, dt: number, track: Track, sample: ObjectSample, context: FrameContext): void {
    const next = this.sampleOf(t, sample);
    const moved = distance(track.last.motion, next.motion);
    const previousSpin = track.spin;
    track.speed = (moved / dt) * 1000;
    track.spin = angleBetween(track.last.quaternion, next.quaternion);
    track.age++;
    track.history.push(next);
    if (track.history.length > SANDBOX_AUDIT.CONTEXT_FRAMES) track.history.shift();

    if (!sample.finite) this.audit.flag(t, 'non-finite-transform', `${sample.name} has a non-finite transform`, sample.name);
    if (!this.ready) {
      track.last = next;
      return;
    }
    // A history of one is the first frame after undrawn ones (breakContinuity): nothing to compare yet.
    if (this.motionChecks && track.history.length > 1) this.checkMotion(t, track, sample, { next, moved, previousSpin });
    this.checkPlacement(t, track, sample, context);
    track.last = next;
  }

  private get judgesMotion(): boolean {
    return this.ready && this.motionChecks;
  }

  private checkMotion(t: number, track: Track, sample: ObjectSample, step: { next: TrackSample; moved: number; previousSpin: number }): void {
    const { next, moved, previousSpin } = step;
    this.checkContinuity(t, track, sample, previousSpin);

    // A dragged card follows the pointer, so its speed is the player's, not the animation's.
    const scripted = track.kind !== 'dragged-card';
    const large = track.kind === 'hand-card'
      ? moved > SANDBOX_AUDIT.MAX_HAND_SCREEN_STEP
      : moved > SANDBOX_AUDIT.MIN_TELEPORT_DISTANCE && track.speed > SANDBOX_AUDIT.MAX_CARD_SPEED_UNITS_PER_S;
    // Fast is not a teleport (a long throw from a phone's high hand is fast); a step that breaks
    // from the previous one is.
    const [p0, p1] = track.history.slice(-3, -1).map((entry) => entry.motion);
    const previousStep = p0 && p1 && track.history.length >= 3 ? difference(p1, p0) : null;
    const jumped = large && isBreak(difference(next.motion, track.last.motion), previousStep);
    if (scripted && track.last.visible && sample.visible && jumped) {
      this.audit.flag(t, 'teleport', `${sample.name} moved ${round(moved)} units in one frame`, sample.name, {
        from: roundVec(track.last.motion),
        to: roundVec(next.motion),
        speed: round(track.speed, 1),
        history: track.history.map((entry) => ({ t: this.audit.relative(entry.t), position: roundVec(entry.position), visible: entry.visible })),
      });
    }
  }

  /** Where the card is, whatever its motion: through the felt, or outside the viewport. */
  private checkPlacement(t: number, track: Track, sample: ObjectSample, context: FrameContext): void {
    if (TABLE_KINDS.has(track.kind) && sample.visible && sample.position[1] < TABLE_SURFACE.FELT_Y - SANDBOX_AUDIT.BELOW_TABLE_TOLERANCE) {
      this.audit.flag(t, 'below-table', `${sample.name} sank to y=${round(sample.position[1])} below the felt`, sample.name, {
        position: roundVec(sample.position),
      });
    }

    if (sample.ndc && sample.visible) this.checkOnScreen(t, track, sample.ndc, context);
  }

  /** Kinks in a scripted path or its rotation: smooth fast motion is fine, a sudden change is not. */
  private checkContinuity(t: number, track: Track, sample: ObjectSample, previousSpin: number): void {
    if (!SCRIPTED_KINDS.has(track.kind) || track.age <= SANDBOX_AUDIT.CONTINUITY_GRACE_FRAMES || !sample.visible) return;
    const points = track.history.slice(-4).map((entry) => entry.motion);
    if (points.length < 3) return;
    const accelerationAt = (index: number): Vec3 => difference(difference(points[index], points[index - 1]), difference(points[index - 1], points[index - 2]));
    const acceleration = accelerationAt(points.length - 1);
    const previousAcceleration = points.length >= 4 ? accelerationAt(points.length - 2) : null;

    // Strong but steady curvature (an orbit, a high arc) is smooth; a sudden change of it is a kink.
    const kink = length(acceleration);
    if (kink > SANDBOX_AUDIT.MAX_PATH_KINK && isBreak(acceleration, previousAcceleration)) {
      this.audit.flag(t, 'path-kink', `${sample.name} changed direction or speed abruptly (kink ${round(kink)} units/frame²)`, sample.name, {
        kink: round(kink),
        history: track.history.map((entry) => ({ t: this.audit.relative(entry.t), position: roundVec(entry.position) })),
      });
    }

    const suddenSpin = track.spin > SANDBOX_AUDIT.ROTATION_POP_RAD && track.spin > 3 * previousSpin + 0.05;
    if (suddenSpin || track.spin > SANDBOX_AUDIT.MAX_SPIN_RAD_PER_FRAME) {
      this.audit.flag(t, 'rotation-pop', `${sample.name} rotated ${round(track.spin)} rad in one frame (previous frame ${round(previousSpin)} rad)`, sample.name, {
        spin: round(track.spin),
        previousSpin: round(previousSpin),
      });
    }
  }

  private checkOnScreen(t: number, track: Track, ndc: NdcBounds, context: FrameContext): void {
    const hidden = hiddenFraction(ndc);
    if (hidden <= SANDBOX_AUDIT.OFFSCREEN_MAX_HIDDEN_FRACTION) return;

    if (track.kind === 'hand-card' && !context.handAnimating) {
      this.audit.flag(t, 'hand-offscreen', `${Math.round(hidden * 100)}% of hand card ${track.cardId} is outside the viewport`, 'hand', {
        cardId: track.cardId,
        ndc,
      });
    }
    const resting = track.kind === 'played-card' && !this.hooks.isPlayedCardAnimating(track.cardId) && track.speed < SANDBOX_AUDIT.SETTLED_MAX_SPEED_UNITS_PER_S;
    if (resting) {
      this.audit.flag(t, 'played-offscreen', `${Math.round(hidden * 100)}% of played card ${track.cardId} rests outside the viewport`, track.cardId, { ndc });
    }
  }

  private unmount(t: number, track: Track): void {
    this.tracks.delete(track.name);
    this.recentUnmounts.push({ name: track.name, kind: track.kind, cardId: track.cardId, t, frame: this.audit.frame, position: track.last.position });
    this.audit.log(t, 'unmount', track.name, { position: roundVec(track.last.position) });
    this.hooks.onUnmount(t, track);
  }

  private checkDoubleRender(t: number, samples: ObjectSample[]): void {
    const owners = new Map<string, Set<SceneObjectKind>>();
    for (const sample of samples) {
      if (!sample.visible || !TABLE_KINDS.has(sample.kind)) continue;
      const kinds = owners.get(sample.cardId) ?? new Set<SceneObjectKind>();
      kinds.add(sample.kind);
      owners.set(sample.cardId, kinds);
    }

    for (const cardId of [...this.doubleRenderFrames.keys()]) {
      if ((owners.get(cardId)?.size ?? 0) < 2) this.doubleRenderFrames.delete(cardId);
    }
    for (const [cardId, kinds] of owners) {
      if (kinds.size < 2) continue;
      const frames = (this.doubleRenderFrames.get(cardId) ?? 0) + 1;
      this.doubleRenderFrames.set(cardId, frames);
      if (frames > SANDBOX_AUDIT.DOUBLE_RENDER_MAX_FRAMES) {
        this.audit.flag(t, 'double-render', `${cardId} is drawn as ${[...kinds].join(' and ')} at once`, cardId, { kinds: [...kinds] });
      }
    }
  }
}
