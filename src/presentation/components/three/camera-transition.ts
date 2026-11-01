import { CAMERA_CONFIG } from '@/presentation/config/layout.config';

type Vec3 = readonly [number, number, number];

/** What the scene camera shows: where it stands, the orbit target it looks at, and its zoom */
export interface CameraPose {
  position: Vec3;
  target: Vec3;
  zoom: number;
}

function distanceBetween(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Starts and ends at rest; its steepest slope (at the middle) is SMOOTHSTEP_PEAK_SLOPE */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

const SMOOTHSTEP_PEAK_SLOPE = 1.5;

/**
 * How long the camera takes to glide from one framing to another: long enough that neither the
 * camera nor its target ever moves faster than MAX_SPEED, and never shorter than MIN_MS.
 */
export function getCameraTransitionMs(from: CameraPose, to: CameraPose): number {
  const { MIN_MS, MAX_SPEED } = CAMERA_CONFIG.FRAMING_TRANSITION;
  const travel = Math.max(distanceBetween(from.position, to.position), distanceBetween(from.target, to.target));
  return Math.max(MIN_MS, (SMOOTHSTEP_PEAK_SLOPE * travel * 1000) / MAX_SPEED);
}

/** The pose `progress` (0..1, clamped) of the way from one framing to the other, eased in and out */
export function interpolateCameraPose(from: CameraPose, to: CameraPose, progress: number): CameraPose {
  const t = smoothstep(Math.min(1, Math.max(0, progress)));
  return {
    position: lerpVec3(from.position, to.position, t),
    target: lerpVec3(from.target, to.target, t),
    zoom: lerp(from.zoom, to.zoom, t),
  };
}
