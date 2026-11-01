import type { HallCameraStop, Vec3 } from '@/presentation/config/realm-hall.config';

/** Position along the walk: 0 at the first stop, n - 1 at the last; fractions sit between stops. */
export type HallProgress = number;

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function mix(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** The camera pose at a point of the walk, eased between stops so the camera settles at each one. */
export function cameraPoseAt(stops: readonly HallCameraStop[], progress: HallProgress): HallCameraStop {
  const last = stops.length - 1;
  const clamped = Math.min(Math.max(progress, 0), last);
  const index = Math.min(Math.floor(clamped), last - 1);
  if (index < 0) return stops[0];
  const t = smoothstep(clamped - index);
  return { position: mix(stops[index].position, stops[index + 1].position, t), target: mix(stops[index].target, stops[index + 1].target, t) };
}

/** Where a station section sits in the document: its top and height in CSS px. */
export interface StationBox {
  top: number;
  height: number;
}

/**
 * Walk progress for a scroll position. A station is reached when its centre crosses the middle
 * of the viewport; between two centres the walk is part of the way to the next stop.
 */
export function progressForScroll(stations: readonly StationBox[], scrollY: number, viewportHeight: number): HallProgress {
  if (stations.length < 2) return 0;
  const focus = scrollY + viewportHeight / 2;
  const centres = stations.map((station) => station.top + station.height / 2);
  if (focus <= centres[0]) return 0;
  for (let index = 0; index < centres.length - 1; index++) {
    if (focus < centres[index + 1]) return index + (focus - centres[index]) / (centres[index + 1] - centres[index]);
  }
  return centres.length - 1;
}
