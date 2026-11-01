/**
 * Keyframed billboards (comic burst, +1 text, chromatic flash) and flat
 * decals on the felt (ink splatters). Materials are created once per mount;
 * textures and the decal quad are shared.
 */

import * as THREE from 'three';
import { LAND_FX_LAYOUT } from '../land-fx.constants';
import { pick, range, type Rng } from '../land-fx-selection';
import { getFxTexture, type FxTextureId } from '../textures';
import type { FxBlending } from './point-sprite-material';
import { sampleKeys, type Keyframes, type LandFxLayer } from './types';

const toBlending = (b: FxBlending | undefined) =>
  b === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending;

export interface BillboardSpec {
  /** One is picked per landing (e.g. BAM! or POW!). */
  textures: readonly FxTextureId[];
  color?: string;
  blending?: FxBlending;
  offset: readonly [number, number, number];
  /** Random xz jitter radius. */
  jitter?: number;
  scale: Keyframes;
  opacity: Keyframes;
  /** Extra height over time. */
  rise?: Keyframes;
  /** Max random roll in radians. */
  tilt?: number;
  renderOrder?: number;
}

export class BillboardLayer implements LandFxLayer {
  readonly object = new THREE.Group();
  private readonly sprites: THREE.Sprite[] = [];
  private readonly specs: readonly BillboardSpec[];
  private readonly base: THREE.Vector3[] = [];

  constructor(specs: readonly BillboardSpec[]) {
    this.specs = specs;
    specs.forEach((spec) => {
      const material = new THREE.SpriteMaterial({
        map: getFxTexture(spec.textures[0]),
        color: spec.color ?? '#ffffff',
        transparent: true,
        depthWrite: false,
        depthTest: true,
        opacity: 0,
        blending: toBlending(spec.blending),
      });
      const sprite = new THREE.Sprite(material);
      sprite.renderOrder = spec.renderOrder ?? 3;
      sprite.visible = false;
      this.object.add(sprite);
      this.sprites.push(sprite);
      this.base.push(new THREE.Vector3());
    });
  }

  reset(rand: Rng): void {
    this.specs.forEach((spec, i) => {
      const sprite = this.sprites[i];
      const material = sprite.material;
      material.map = getFxTexture(pick(rand, spec.textures));
      material.rotation = spec.tilt ? range(rand, -spec.tilt, spec.tilt) : 0;
      const j = spec.jitter ?? 0;
      this.base[i].set(spec.offset[0] + range(rand, -j, j), spec.offset[1], spec.offset[2] + range(rand, -j, j));
      sprite.visible = false;
    });
  }

  update(t: number): void {
    this.specs.forEach((spec, i) => {
      const sprite = this.sprites[i];
      const opacity = sampleKeys(spec.opacity, t);
      sprite.visible = opacity > 0.005;
      if (!sprite.visible) return;
      sprite.material.opacity = opacity;
      sprite.scale.setScalar(Math.max(1e-3, sampleKeys(spec.scale, t)));
      sprite.position.copy(this.base[i]);
      if (spec.rise) sprite.position.y += sampleKeys(spec.rise, t);
    });
  }

  dispose(): void {
    this.sprites.forEach((s) => s.material.dispose());
  }
}

export interface DecalSpec {
  count: number;
  texture: FxTextureId;
  color: string;
  size: readonly [number, number];
  radius: readonly [number, number];
  /** Scale multiplier over time (splat spreading). */
  scale: Keyframes;
  opacity: Keyframes;
  /** Seconds between consecutive decals appearing. */
  stagger?: number;
}

let decalQuad: THREE.PlaneGeometry | null = null;
function getDecalQuad(): THREE.PlaneGeometry {
  if (!decalQuad) {
    decalQuad = new THREE.PlaneGeometry(1, 1);
    decalQuad.rotateX(-Math.PI / 2);
  }
  return decalQuad;
}

export class DecalLayer implements LandFxLayer {
  readonly object = new THREE.Group();
  private readonly meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly sizes: number[] = [];
  private readonly spec: DecalSpec;

  constructor(spec: DecalSpec) {
    this.spec = spec;
    for (let i = 0; i < spec.count; i++) {
      const material = new THREE.MeshBasicMaterial({
        map: getFxTexture(spec.texture),
        color: spec.color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const mesh = new THREE.Mesh(getDecalQuad(), material);
      mesh.position.y = LAND_FX_LAYOUT.DECAL_Y + i * LAND_FX_LAYOUT.DECAL_Y_STEP;
      mesh.renderOrder = 1;
      mesh.visible = false;
      this.object.add(mesh);
      this.meshes.push(mesh);
      this.sizes.push(1);
    }
  }

  reset(rand: Rng): void {
    const start = rand() * Math.PI * 2;
    this.meshes.forEach((mesh, i) => {
      const angle = start + (i / this.meshes.length) * Math.PI * 2 + range(rand, -0.5, 0.5);
      const r = range(rand, this.spec.radius[0], this.spec.radius[1]);
      mesh.position.x = Math.cos(angle) * r;
      mesh.position.z = Math.sin(angle) * r;
      mesh.rotation.y = rand() * Math.PI * 2;
      this.sizes[i] = range(rand, this.spec.size[0], this.spec.size[1]);
      mesh.visible = false;
    });
  }

  update(t: number): void {
    const stagger = this.spec.stagger ?? 0;
    this.meshes.forEach((mesh, i) => {
      const local = t - i * stagger;
      const opacity = local < 0 ? 0 : sampleKeys(this.spec.opacity, local);
      mesh.visible = opacity > 0.005;
      if (!mesh.visible) return;
      mesh.material.opacity = opacity;
      mesh.scale.setScalar(this.sizes[i] * Math.max(1e-3, sampleKeys(this.spec.scale, local)));
    });
  }

  dispose(): void {
    this.meshes.forEach((m) => m.material.dispose());
  }
}
