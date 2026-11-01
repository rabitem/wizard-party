import * as THREE from 'three';

type Vec3 = [number, number, number];

/** Where the copies of a decorative part sit: evenly spaced on a horizontal ring */
export interface RingLayout {
  count: number;
  radius: number;
  y: number;
  /** Angle of the first copy, in radians */
  angleOffset?: number;
  /** Turn each copy so its local +Z points away from the ring centre (apron inlays) */
  faceOutward?: boolean;
}

/** Transform of one part relative to its ring slot */
export interface PartTransform {
  position?: Vec3;
  rotation?: Vec3;
}

/** Angle of copy `index` on the ring */
function ringAngle(index: number, layout: RingLayout): number {
  return (index / layout.count) * Math.PI * 2 + (layout.angleOffset ?? 0);
}

/**
 * Instance matrices for one part repeated around a ring: slot transform (position on the ring,
 * optional outward yaw) times the part's local transform. Rendering all copies through one
 * InstancedMesh costs one draw call instead of one per copy.
 */
export function ringInstanceMatrices(layout: RingLayout, part: PartTransform = {}): THREE.Matrix4[] {
  const local = new THREE.Matrix4().compose(
    new THREE.Vector3(...(part.position ?? [0, 0, 0])),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...(part.rotation ?? [0, 0, 0]))),
    new THREE.Vector3(1, 1, 1)
  );
  const slotRotation = new THREE.Euler();

  return Array.from({ length: layout.count }, (_, i) => {
    const angle = ringAngle(i, layout);
    slotRotation.set(0, layout.faceOutward ? -angle + Math.PI / 2 : 0, 0);
    const slot = new THREE.Matrix4().compose(
      new THREE.Vector3(Math.cos(angle) * layout.radius, layout.y, Math.sin(angle) * layout.radius),
      new THREE.Quaternion().setFromEuler(slotRotation),
      new THREE.Vector3(1, 1, 1)
    );
    return slot.multiply(local);
  });
}
