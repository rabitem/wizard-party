'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { SPRING_COLORS, SPRING_LANTERN_COLORS, SPRING_LAYOUT } from '@/presentation/config/spring-environment.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import {
  createGlowMaterial,
  GlowSprites,
  InstancedProp,
  localMatrix,
  useDisposables,
  useFlicker,
  type GlowPoint,
  type PropPlacement,
} from '../primitives';
import { MatrixInstances } from '../primitives/MatrixInstances';

const LANTERN = { RADIUS: 0.22, STRETCH: 1.25, CAP_RADIUS: 0.1, CAP_HEIGHT: 0.05, DROP: 0.32 } as const;
const STRING = { RADIUS: 0.008, SEGMENTS: 8 } as const;
const GLOW_SCALE = 1.15;
const UP = new THREE.Vector3(0, 1, 0);

interface LanternLayout {
  strings: THREE.Matrix4[];
  lanterns: PropPlacement[];
  glows: GlowPoint[];
}

/** Point on the sagging string between two columns (t in 0..1). */
function stringPoint(a: [number, number], b: [number, number], t: number): THREE.Vector3 {
  const y = SPRING_LAYOUT.LANTERN_HANG_Y - SPRING_LAYOUT.LANTERN_SAG * 4 * t * (1 - t);
  return new THREE.Vector3(a[0] + (b[0] - a[0]) * t, y, a[1] + (b[1] - a[1]) * t);
}

/** Thin cylinder matrix spanning two points. */
function segmentMatrix(from: THREE.Vector3, to: THREE.Vector3): THREE.Matrix4 {
  const direction = to.clone().sub(from);
  const length = direction.length();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize());
  const middle = from.clone().add(to).multiplyScalar(0.5);
  return new THREE.Matrix4().compose(middle, quaternion, new THREE.Vector3(1, length, 1));
}

function buildLanterns(): LanternLayout {
  const layout: LanternLayout = { strings: [], lanterns: [], glows: [] };
  const columns = SPRING_LAYOUT.COLUMNS;
  const perSpan = SPRING_LAYOUT.LANTERNS_PER_SPAN;
  for (let c = 0; c < columns.length - 1; c++) {
    const a = columns[c];
    const b = columns[c + 1];
    for (let s = 0; s < STRING.SEGMENTS; s++) {
      layout.strings.push(segmentMatrix(stringPoint(a, b, s / STRING.SEGMENTS), stringPoint(a, b, (s + 1) / STRING.SEGMENTS)));
    }
    for (let l = 0; l < perSpan; l++) {
      const point = stringPoint(a, b, (l + 1) / (perSpan + 1));
      const center: Vec3 = [point.x, point.y - LANTERN.DROP, point.z];
      const index = c * perSpan + l;
      layout.lanterns.push({ position: center, rotationY: index * 0.6, color: SPRING_LANTERN_COLORS[index % SPRING_LANTERN_COLORS.length] });
      layout.glows.push({ position: center, scale: GLOW_SCALE });
      layout.strings.push(segmentMatrix(point, new THREE.Vector3(point.x, center[1] + LANTERN.RADIUS * LANTERN.STRETCH, point.z)));
    }
  }
  return layout;
}

const CAP_TOP = localMatrix([0, LANTERN.RADIUS * LANTERN.STRETCH, 0]);
const CAP_BOTTOM = localMatrix([0, -LANTERN.RADIUS * LANTERN.STRETCH, 0]);

/** Pastel paper lanterns strung in sagging garlands between the pavilion columns. */
export function PaperLanterns() {
  const layout = useMemo(() => buildLanterns(), []);
  const assets = useMemo(() => {
    const paper = new THREE.SphereGeometry(LANTERN.RADIUS, 10, 8);
    paper.scale(1, LANTERN.STRETCH, 1);
    return {
      paper,
      cap: new THREE.CylinderGeometry(LANTERN.CAP_RADIUS, LANTERN.CAP_RADIUS, LANTERN.CAP_HEIGHT, 8),
      string: new THREE.CylinderGeometry(STRING.RADIUS, STRING.RADIUS, 1, 3),
      glowPaper: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      capMaterial: new THREE.MeshStandardMaterial({ color: SPRING_COLORS.lanternCap, roughness: 0.6 }),
      stringMaterial: new THREE.MeshBasicMaterial({ color: SPRING_COLORS.lanternString }),
      glow: createGlowMaterial(SPRING_COLORS.lanternGlow, 0.4),
    };
  }, []);
  useDisposables(assets);

  const flickerTargets = useMemo(() => [{ material: assets.glow, base: 0.4, amplitude: 0.12, phase: 1.1, useOpacity: true }], [assets]);
  useFlicker(flickerTargets);

  return (
    <group>
      <MatrixInstances geometry={assets.string} material={assets.stringMaterial} matrices={layout.strings} />
      <InstancedProp geometry={assets.paper} material={assets.glowPaper} placements={layout.lanterns} />
      <InstancedProp geometry={assets.cap} material={assets.capMaterial} placements={layout.lanterns} offset={CAP_TOP} />
      <InstancedProp geometry={assets.cap} material={assets.capMaterial} placements={layout.lanterns} offset={CAP_BOTTOM} />
      <GlowSprites points={layout.glows} material={assets.glow} />
    </group>
  );
}
