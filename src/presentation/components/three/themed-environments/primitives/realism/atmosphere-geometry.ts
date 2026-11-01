import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LIGHT_SHAFTS } from '@/presentation/config/realism.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';

export interface LightShaft {
  /** Where the light enters (window, skylight) */
  source: Vec3;
  /** Point the shaft travels toward (usually on the floor) */
  target: Vec3;
  /** Radius at the source and at the far end */
  radiusStart: number;
  radiusEnd: number;
}

/** Stacked horizontal planes merged into one geometry; aLayer orders them bottom -> top. */
export function createFogGeometry(layers: number, width: number, depth: number, height: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let layer = 0; layer < layers; layer++) {
    const plane = new THREE.PlaneGeometry(width, depth, 1, 1);
    plane.rotateX(-Math.PI / 2);
    plane.translate(0, (height * (layer + 0.5)) / layers, 0);
    plane.setAttribute('aLayer', new THREE.Float32BufferAttribute([layer, layer, layer, layer], 1));
    parts.push(plane);
  }
  const merged = mergeGeometries(parts) ?? new THREE.BufferGeometry();
  parts.forEach((part) => part.dispose());
  return merged;
}

const DOWN = new THREE.Vector3(0, -1, 0);

/** All cones merged into one geometry; aAlong runs 0 (source) -> 1 (far end). */
export function createShaftGeometry(shafts: readonly LightShaft[]): THREE.BufferGeometry {
  const parts = shafts.map((shaft) => {
    const source = new THREE.Vector3(...shaft.source);
    const direction = new THREE.Vector3(...shaft.target).sub(source);
    const length = direction.length();
    const cone = new THREE.CylinderGeometry(shaft.radiusStart, shaft.radiusEnd, 1, LIGHT_SHAFTS.RADIAL_SEGMENTS, 1, true);
    const uvY = cone.getAttribute('uv');
    const along = new Float32Array(uvY.count);
    for (let i = 0; i < uvY.count; i++) along[i] = 1 - uvY.getY(i);
    cone.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
    cone.translate(0, -0.5, 0);
    cone.scale(1, length, 1);
    const rotation = new THREE.Quaternion().setFromUnitVectors(DOWN, direction.normalize());
    cone.applyQuaternion(rotation);
    cone.translate(source.x, source.y, source.z);
    return cone;
  });
  const merged = parts.length > 0 ? mergeGeometries(parts) : null;
  parts.forEach((part) => part.dispose());
  return merged ?? new THREE.BufferGeometry();
}
