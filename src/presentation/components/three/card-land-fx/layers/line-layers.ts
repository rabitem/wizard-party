/**
 * Line-like layers: tapered manga speed lines on the felt and the celestial
 * constellation (twinkling star points joined by lines that draw in, flash
 * and fade).
 */

import * as THREE from 'three';
import { LAND_FX_LAYOUT } from '../land-fx.constants';
import { range, type Rng } from '../land-fx-selection';
import { PointBurstLayer } from './point-burst-layer';
import { sampleKeys, type Keyframes, type LandFxLayer } from './types';

export interface SpeedLinesSpec {
  count: number;
  color: string;
  inner: Keyframes;
  outer: Keyframes;
  opacity: Keyframes;
  /** Base half-width of each wedge. */
  width: number;
}

export class SpeedLinesLayer implements LandFxLayer {
  readonly object: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly spec: SpeedLinesSpec;
  private readonly angles: Float32Array;
  private readonly lengths: Float32Array;
  private readonly positions: Float32Array;
  private readonly attr: THREE.BufferAttribute;

  constructor(spec: SpeedLinesSpec) {
    this.spec = spec;
    this.angles = new Float32Array(spec.count);
    this.lengths = new Float32Array(spec.count);
    this.positions = new Float32Array(spec.count * 9);
    const geometry = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.attr);
    const material = new THREE.MeshBasicMaterial({
      color: spec.color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.object = new THREE.Mesh(geometry, material);
    this.object.position.y = LAND_FX_LAYOUT.DECAL_Y + LAND_FX_LAYOUT.DECAL_Y_STEP * 4;
    this.object.frustumCulled = false;
    this.object.renderOrder = 1;
    this.object.visible = false;
  }

  reset(rand: Rng): void {
    for (let i = 0; i < this.spec.count; i++) {
      this.angles[i] = (i / this.spec.count) * Math.PI * 2 + range(rand, -0.15, 0.15);
      this.lengths[i] = range(rand, 0.7, 1.15);
    }
    this.object.visible = false;
  }

  update(t: number): void {
    const opacity = sampleKeys(this.spec.opacity, t);
    this.object.visible = opacity > 0.005;
    if (!this.object.visible) return;
    this.object.material.opacity = opacity;
    const inner = sampleKeys(this.spec.inner, t);
    const outer = sampleKeys(this.spec.outer, t);
    const p = this.positions;
    for (let i = 0; i < this.spec.count; i++) {
      const a = this.angles[i];
      const c = Math.cos(a);
      const s = Math.sin(a);
      const w = this.spec.width * this.lengths[i];
      const r0 = inner;
      const r1 = inner + (outer - inner) * this.lengths[i];
      const o = i * 9;
      // Wide end near the card, sharp tip outward
      p[o] = c * r0 - s * w;
      p[o + 1] = 0;
      p[o + 2] = s * r0 + c * w;
      p[o + 3] = c * r0 + s * w;
      p[o + 4] = 0;
      p[o + 5] = s * r0 - c * w;
      p[o + 6] = c * r1;
      p[o + 7] = 0;
      p[o + 8] = s * r1;
    }
    this.attr.needsUpdate = true;
  }

  dispose(): void {
    this.object.geometry.dispose();
    this.object.material.dispose();
  }
}

export interface ConstellationSpec {
  points: number;
  color: THREE.Color;
  radius: readonly [number, number];
  height: readonly [number, number];
  starSize: number;
  /** Seconds over which the segments draw in, one after another. */
  drawIn: readonly [number, number];
  lineOpacity: Keyframes;
}

export class ConstellationLayer implements LandFxLayer {
  readonly object = new THREE.Group();
  private readonly spec: ConstellationSpec;
  private readonly anchors: Float32Array;
  private readonly stars: PointBurstLayer;
  private readonly lines: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly linePositions: Float32Array;
  private readonly lineAttr: THREE.BufferAttribute;

  constructor(spec: ConstellationSpec) {
    this.spec = spec;
    this.anchors = new Float32Array(spec.points * 3);
    this.stars = new PointBurstLayer({
      capacity: spec.points,
      texture: 'spark',
      blending: 'additive',
      step: { fadeIn: 0.15, fadePow: 2.5, twinkle: 18 },
      emit: (pool, rand) => {
        for (let i = 0; i < spec.points; i++) {
          pool.spawn({
            x: this.anchors[i * 3],
            y: this.anchors[i * 3 + 1],
            z: this.anchors[i * 3 + 2],
            vx: 0,
            vy: 0.02,
            vz: 0,
            life: range(rand, 0.75, 0.95),
            size: spec.starSize * range(rand, 0.8, 1.25),
            r: spec.color.r,
            g: spec.color.g,
            b: spec.color.b,
            delay: (i / spec.points) * spec.drawIn[1] * 0.6,
            phase: rand() * Math.PI * 2,
          });
        }
      },
    });
    const segments = Math.max(0, spec.points - 1);
    this.linePositions = new Float32Array(segments * 6);
    const geometry = new THREE.BufferGeometry();
    this.lineAttr = new THREE.BufferAttribute(this.linePositions, 3).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.lineAttr);
    this.lines = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.lines.frustumCulled = false;
    this.object.add(this.stars.object, this.lines);
  }

  reset(rand: Rng): void {
    // Walk around the card so the figure reads as a loose chain, not a scribble
    let angle = rand() * Math.PI * 2;
    for (let i = 0; i < this.spec.points; i++) {
      angle += range(rand, 0.7, 1.4);
      const r = range(rand, this.spec.radius[0], this.spec.radius[1]);
      this.anchors[i * 3] = Math.cos(angle) * r;
      this.anchors[i * 3 + 1] = range(rand, this.spec.height[0], this.spec.height[1]);
      this.anchors[i * 3 + 2] = Math.sin(angle) * r;
    }
    this.stars.reset(rand);
    this.lines.visible = false;
  }

  update(t: number, dt: number): void {
    this.stars.update(t, dt);
    const opacity = sampleKeys(this.spec.lineOpacity, t);
    this.lines.visible = opacity > 0.005;
    if (!this.lines.visible) return;
    this.lines.material.opacity = opacity;
    const segments = this.spec.points - 1;
    const [start, end] = this.spec.drawIn;
    const progress = Math.min(1, Math.max(0, (t - start) / (end - start))) * segments;
    const a = this.anchors;
    const p = this.linePositions;
    for (let s = 0; s < segments; s++) {
      const f = Math.min(1, Math.max(0, progress - s));
      const i0 = s * 3;
      const i1 = (s + 1) * 3;
      const o = s * 6;
      p[o] = a[i0];
      p[o + 1] = a[i0 + 1];
      p[o + 2] = a[i0 + 2];
      p[o + 3] = a[i0] + (a[i1] - a[i0]) * f;
      p[o + 4] = a[i0 + 1] + (a[i1 + 1] - a[i0 + 1]) * f;
      p[o + 5] = a[i0 + 2] + (a[i1 + 2] - a[i0 + 2]) * f;
    }
    this.lineAttr.needsUpdate = true;
  }

  dispose(): void {
    this.stars.dispose();
    this.lines.geometry.dispose();
    this.lines.material.dispose();
  }
}
