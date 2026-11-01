import type * as THREE from 'three';
import { FRAME_SCHEDULING } from '@/presentation/config/render-quality.config';
import { isAmbient } from './ambient';

interface ObjectSnapshot {
  matrix: Float64Array;
  /** Version of the per-instance or per-vertex data that animates without the object moving */
  dataVersion: number;
}

type DataCarrier = THREE.Object3D & {
  instanceMatrix?: THREE.BufferAttribute;
  geometry?: THREE.BufferGeometry;
};

/** Instanced transforms and CPU particle positions animate through buffer versions. */
function dataVersion(object: DataCarrier): number {
  const instances = object.instanceMatrix?.version ?? 0;
  const positions = (object.geometry?.attributes?.position as THREE.BufferAttribute | undefined)?.version ?? 0;
  return instances + positions;
}

/**
 * Detects visible motion between rendered frames without any component having to report it:
 * compares every visible object's world matrix (and instance / particle buffer versions) with
 * the previous frame. Objects in ambient subtrees are skipped, as is drift slower than the
 * configured threshold, so idle breathing does not keep the frame rate up while a card flight,
 * a camera move or a mount does.
 *
 * Cost: one pass over the visible scene graph with 16 float compares per object.
 */
export class SceneMotionMonitor {
  private readonly snapshots = new WeakMap<THREE.Object3D, ObjectSnapshot>();
  private lastSampleAt: number | null = null;
  private lastTrackedCount = -1;
  private trackedCount = 0;
  private moved = false;
  private limit = 0;

  constructor(private readonly thresholdPerSecond: number = FRAME_SCHEDULING.MOTION_THRESHOLD_PER_SECOND) {}

  /**
   * True when anything non-ambient moved, appeared or disappeared since the previous sample.
   * The camera is compared too: it usually lives outside the scene graph, and a camera move
   * (framing transition, orbit damping) changes every pixel.
   */
  sample(root: THREE.Object3D, nowMs: number, camera?: THREE.Camera): boolean {
    const elapsedSeconds = this.lastSampleAt === null ? 0 : Math.max(nowMs - this.lastSampleAt, 1) / 1000;
    this.lastSampleAt = nowMs;
    this.limit = this.thresholdPerSecond * elapsedSeconds;
    this.moved = false;
    this.trackedCount = 0;
    if (camera && camera.parent === null && this.compareAndStore(camera as DataCarrier)) this.moved = true;
    this.visit(root);
    const membershipChanged = this.trackedCount !== this.lastTrackedCount;
    this.lastTrackedCount = this.trackedCount;
    return this.moved || membershipChanged;
  }

  private visit(object: THREE.Object3D): void {
    if (!object.visible || isAmbient(object)) return;
    this.trackedCount++;
    if (this.compareAndStore(object as DataCarrier)) this.moved = true;
    const { children } = object;
    for (let i = 0; i < children.length; i++) this.visit(children[i]);
  }

  private compareAndStore(object: DataCarrier): boolean {
    const elements = object.matrixWorld.elements;
    const version = dataVersion(object);
    const snapshot = this.snapshots.get(object);
    if (!snapshot) {
      this.snapshots.set(object, { matrix: Float64Array.from(elements), dataVersion: version });
      return true;
    }
    let changed = snapshot.dataVersion !== version;
    snapshot.dataVersion = version;
    const stored = snapshot.matrix;
    for (let i = 0; i < 16; i++) {
      if (Math.abs(elements[i] - stored[i]) > this.limit) changed = true;
      stored[i] = elements[i];
    }
    return changed;
  }
}
