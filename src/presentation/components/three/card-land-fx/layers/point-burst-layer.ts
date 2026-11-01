/**
 * Pooled point-sprite particle burst. The pool's typed arrays back the
 * BufferAttributes directly, so a landing only rewrites existing memory.
 */

import * as THREE from 'three';
import { DEFAULT_STEP_PARAMS, ParticlePool, type ParticleStepParams } from '../particle-pool';
import { pick, range, type Rng } from '../land-fx-selection';
import type { FxTextureId } from '../textures';
import { getPointSpriteMaterial, syncPointScale, type FxBlending } from './point-sprite-material';
import type { LandFxLayer } from './types';

export interface PointBurstOptions {
  capacity: number;
  texture: FxTextureId;
  blending?: FxBlending;
  step?: Partial<ParticleStepParams>;
  emit: (pool: ParticlePool, rand: Rng) => void;
}

type Range = readonly [number, number];

export interface RadialEmitOptions {
  count: number;
  colors: readonly THREE.Color[];
  speed: Range;
  up: Range;
  life: Range;
  size: Range;
  /** Spawn radius around the landing point. */
  radius?: Range;
  y?: number;
  opacity?: Range;
  delay?: Range;
  spin?: Range;
  flutter?: Range;
}

/** Fills the pool with a radial burst (random direction, speed, colour). */
export function emitRadial(pool: ParticlePool, rand: Rng, o: RadialEmitOptions): void {
  for (let i = 0; i < o.count; i++) {
    const theta = rand() * Math.PI * 2;
    const r = o.radius ? range(rand, o.radius[0], o.radius[1]) : 0;
    const speed = range(rand, o.speed[0], o.speed[1]);
    const color = pick(rand, o.colors);
    const spin = o.spin ? range(rand, o.spin[0], o.spin[1]) * (rand() < 0.5 ? -1 : 1) : 0;
    pool.spawn({
      x: Math.cos(theta) * r,
      y: o.y ?? 0,
      z: Math.sin(theta) * r,
      vx: Math.cos(theta) * speed,
      vy: range(rand, o.up[0], o.up[1]),
      vz: Math.sin(theta) * speed,
      life: range(rand, o.life[0], o.life[1]),
      size: range(rand, o.size[0], o.size[1]),
      r: color.r,
      g: color.g,
      b: color.b,
      opacity: o.opacity ? range(rand, o.opacity[0], o.opacity[1]) : 1,
      delay: o.delay ? range(rand, o.delay[0], o.delay[1]) : 0,
      rotation: rand() * Math.PI * 2,
      spin,
      flutter: o.flutter ? range(rand, o.flutter[0], o.flutter[1]) : 0,
      phase: rand() * Math.PI * 2,
    });
  }
}

/** Hex list -> linear THREE.Color list (built once per recipe module). */
export function toColors(hexes: readonly string[]): THREE.Color[] {
  return hexes.map((hex) => new THREE.Color(hex));
}

export class PointBurstLayer implements LandFxLayer {
  readonly object: THREE.Points;
  private readonly pool: ParticlePool;
  private readonly geometry: THREE.BufferGeometry;
  private readonly params: ParticleStepParams;
  private readonly attrs: THREE.BufferAttribute[];
  private readonly colorAttr: THREE.BufferAttribute;
  private readonly emit: PointBurstOptions['emit'];

  constructor(options: PointBurstOptions) {
    this.pool = new ParticlePool(options.capacity);
    this.params = { ...DEFAULT_STEP_PARAMS, ...options.step };
    this.emit = options.emit;
    const g = new THREE.BufferGeometry();
    const position = new THREE.BufferAttribute(this.pool.position, 3).setUsage(THREE.DynamicDrawUsage);
    this.colorAttr = new THREE.BufferAttribute(this.pool.color, 3);
    const size = new THREE.BufferAttribute(this.pool.size, 1).setUsage(THREE.DynamicDrawUsage);
    const alpha = new THREE.BufferAttribute(this.pool.alpha, 1).setUsage(THREE.DynamicDrawUsage);
    const rot = new THREE.BufferAttribute(this.pool.rotation, 1).setUsage(THREE.DynamicDrawUsage);
    const flip = new THREE.BufferAttribute(this.pool.flip, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', position);
    g.setAttribute('aColor', this.colorAttr);
    g.setAttribute('aSize', size);
    g.setAttribute('aAlpha', alpha);
    g.setAttribute('aRot', rot);
    g.setAttribute('aFlip', flip);
    g.setDrawRange(0, 0);
    this.geometry = g;
    this.attrs = [position, size, alpha, rot, flip];
    this.object = new THREE.Points(g, getPointSpriteMaterial(options.texture, options.blending ?? 'normal'));
    this.object.frustumCulled = false;
    this.object.onBeforeRender = (renderer) => syncPointScale(renderer);
  }

  reset(rand: Rng): void {
    this.pool.reset();
    this.emit(this.pool, rand);
    this.geometry.setDrawRange(0, this.pool.count);
    this.colorAttr.needsUpdate = true;
    this.pool.step(0, this.params);
    this.markDirty();
  }

  update(_t: number, dt: number): void {
    this.pool.step(dt, this.params);
    this.markDirty();
  }

  dispose(): void {
    this.geometry.dispose();
  }

  private markDirty(): void {
    for (const attr of this.attrs) attr.needsUpdate = true;
  }
}
