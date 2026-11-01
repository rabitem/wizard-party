import {
  MotionAudit,
  type AnomalyCode as MotionCode,
  type Anomaly as MotionAnomaly,
  type Bounds,
  type MotionReport,
  type ObjectSample,
  type RoleOptions,
  type Thresholds,
  type Track,
} from 'three-motion-audit';
import { TABLE_SURFACE } from '../../config/card-physics';
import { SANDBOX_AUDIT } from '../../config/sandbox.config';
import { parseSceneObjectName, type SceneObjectKind } from '../three/scene-object-names';
import { ANOMALY_SEVERITY } from './audit-log';
import type { Anomaly, AnomalyCode } from './sandbox.types';

/** The id and role the camera is tracked under, so camera cuts show up (as camera-jump). */
export const CAMERA_TRACK = 'camera';

/** Checks that compare one frame with the next; off when the probe samples only every Nth frame (perf mode). */
const FRAME_TO_FRAME_CODES: readonly MotionCode[] = ['teleport', 'path-kink', 'rotation-pop', 'handoff-pop', 'handoff-gap'];

/** Checks only table cards get: what the hand, a drag or the camera does is layout or input, not a card animation. */
const TABLE_ONLY_CODES: readonly MotionCode[] = ['path-kink', 'rotation-pop', 'handoff-pop', 'handoff-gap', 'duplicate', 'not-settled'];

const TABLE_BOUNDS: Bounds = { minY: TABLE_SURFACE.FELT_Y - SANDBOX_AUDIT.BELOW_TABLE_TOLERANCE };

/** Table cards rest when they stop moving: spin is judged in flight (rotation-pop), not at rest. */
const TABLE_REST: Partial<Thresholds> = { restAngularSpeed: Number.POSITIVE_INFINITY };

const ROLES: Record<SceneObjectKind | typeof CAMERA_TRACK, RoleOptions> = {
  // The hand rides on the camera, so it is judged by where it appears on screen.
  'hand-card': { space: 'screen', ignore: TABLE_ONLY_CODES },
  // A dragged card follows the pointer: its speed is the player's.
  'dragged-card': { ignore: ['teleport', ...TABLE_ONLY_CODES] },
  'played-card': {
    bounds: TABLE_BOUNDS,
    // A card may wait out a slow network between leaving the hand and landing on the table: the
    // hand -> table seam is judged however long that takes.
    thresholds: { ...TABLE_REST, handoffTolerance: SANDBOX_AUDIT.HAND_HANDOFF_TOLERANCE, handoffWindowMs: Number.POSITIVE_INFINITY },
  },
  'collecting-card': { bounds: TABLE_BOUNDS, thresholds: TABLE_REST },
  // Physics settles the won-tricks pile: only jumps count, not the shape of the path.
  'deck-card': { bounds: TABLE_BOUNDS, thresholds: TABLE_REST, ignore: ['path-kink', 'rotation-pop'] },
  [CAMERA_TRACK]: { thresholds: { maxSpeed: 0, minTeleportDistance: SANDBOX_AUDIT.MAX_CAMERA_STEP }, ignore: TABLE_ONLY_CODES },
};

/** The card a scene object shows (object ids are `kind:cardId`, see scene-object-names). */
export function cardIdOf(track: Pick<Track, 'id'>): string {
  return parseSceneObjectName(track.id)?.cardId ?? track.id;
}

/** The report's code for a library finding: some are named by what they mean on the table. */
function reportCode(code: MotionCode, subject: string | undefined): AnomalyCode {
  switch (code) {
    case 'teleport': return subject === CAMERA_TRACK ? 'camera-jump' : 'teleport';
    case 'non-finite': return 'non-finite-transform';
    case 'duplicate': return 'double-render';
    case 'out-of-bounds': return 'below-table';
    case 'offscreen': return subject && parseSceneObjectName(subject)?.kind === 'hand-card' ? 'hand-offscreen' : 'played-offscreen';
    // path-kink, rotation-pop, handoff-pop, handoff-gap, remount-flicker and not-settled keep their names.
    default: return code as AnomalyCode;
  }
}

/** Card objects entering and leaving the scene, for the trick lifecycle. The camera is not one. */
export interface CardLifecycle {
  mounted(t: number, track: Track): void;
  unmounted(t: number, track: Track): void;
}

/**
 * The card scene as three-motion-audit sees it: one role per scene object kind plus the camera,
 * with Wizard Party's tolerances, its loading phase left unjudged and findings in the report's terms.
 */
export class CardSceneMotion {
  private readonly audit: MotionAudit;
  /** The run's frame number of each frame the audit recorded (perf mode and lost contexts skip some). */
  private readonly runFrames: number[] = [];
  private finalReport: MotionReport | null = null;
  private judging = false;
  /** Objects already in the scene when judging started: their re-mount is not news. */
  private carriedOver = new Set<string>();
  /** Objects drawn in the frame being recorded; the others are leaving it. */
  private drawn = new Set<string>();
  /**
   * How many times each card id left the won-tricks pile. Ids repeat every round (the deck is
   * reshuffled), so the entity a card's objects share is the id in its round: a card played next
   * round does not hand over from this round's pile.
   */
  private readonly cardRounds = new Map<string, number>();

  constructor(motionChecks: boolean, private readonly lifecycle: CardLifecycle) {
    const severity = motionChecks ? {} : Object.fromEntries(FRAME_TO_FRAME_CODES.map((code) => [code, 'off' as const]));
    this.audit = new MotionAudit({
      roles: ROLES,
      severity,
      detectors: [{ name: 'card-lifecycle', mount: (track, ctx) => this.mounted(track, ctx.t), unmount: (track, ctx) => this.unmounted(track, ctx.t) }],
    });
  }

  /** Loading is over (the hand is laid out, the camera framed): judging starts now, times relative to `t`. */
  startJudging(t: number): void {
    this.carriedOver = new Set(this.audit.tracks().map((track) => track.id));
    this.audit.reset();
    this.audit.event('ready', undefined, t);
    this.runFrames.length = 0;
    this.judging = true;
  }

  frame(t: number, runFrame: number, samples: readonly ObjectSample[]): void {
    this.drawn = new Set(samples.map((sample) => sample.id));
    this.runFrames.push(runFrame);
    this.audit.frame(samples.map((sample) => this.inRound(sample)), t);
    this.carriedOver.clear();
  }

  /** Frames went undrawn (a lost WebGL context): motion checks start over from the next drawn one. */
  breakContinuity(): void {
    this.audit.breakContinuity();
  }

  /** The whole scene unmounted (game end, disconnect overlay): its objects did not leave one by one. */
  forgetObjects(): void {
    this.audit.forgetObjects();
  }

  present(kind: SceneObjectKind): Track[] {
    return this.audit.tracks().filter((track) => track.role === kind);
  }

  /** Like present, without the objects leaving in the frame being recorded. */
  remaining(kind: SceneObjectKind): Track[] {
    return this.present(kind).filter((track) => this.drawn.has(track.id));
  }

  /** Table cards still moving: the hand, a drag and the camera ignore not-settled. */
  moving(kind?: SceneObjectKind): Track[] {
    return this.audit.moving().filter((track) => !kind || track.role === kind);
  }

  /** Runs the end-of-run check (table cards still moving after settling: not-settled). */
  finish(): void {
    if (this.judging) this.finalReport = this.audit.finish();
  }

  /** Findings since judging started, as report anomalies. */
  anomalies(): Anomaly[] {
    if (!this.judging) return [];
    return (this.finalReport ?? this.audit.report()).anomalies.map((anomaly) => this.toReportAnomaly(anomaly));
  }

  private toReportAnomaly(anomaly: MotionAnomaly): Anomaly {
    const code = reportCode(anomaly.code, anomaly.subject);
    return { ...anomaly, code, severity: ANOMALY_SEVERITY[code], frame: this.runFrames[anomaly.frame - 1] ?? anomaly.frame };
  }

  private inRound(sample: ObjectSample): ObjectSample {
    const generation = sample.entity === undefined ? 0 : this.cardRounds.get(sample.entity) ?? 0;
    return generation === 0 ? sample : { ...sample, entity: `${sample.entity}#${generation}` };
  }

  private mounted(track: Track, t: number): void {
    if (track.role !== CAMERA_TRACK && !this.carriedOver.has(track.id)) this.lifecycle.mounted(t, track);
  }

  private unmounted(track: Track, t: number): void {
    if (track.role === CAMERA_TRACK) return;
    // The won-tricks pile leaves at the end of the round.
    if (track.role === 'deck-card') {
      const cardId = cardIdOf(track);
      this.cardRounds.set(cardId, (this.cardRounds.get(cardId) ?? 0) + 1);
    }
    this.lifecycle.unmounted(t, track);
  }
}
