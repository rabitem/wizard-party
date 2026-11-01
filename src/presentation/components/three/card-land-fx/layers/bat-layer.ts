/**
 * The occasional Halloween bat: a low-poly body with two scalloped wings that
 * flap while it flutters up and away from the landing point. Geometry and
 * materials are shared by every card; one bat object per card is reused.
 */

import * as THREE from 'three';
import { LAND_FX_COLORS } from '../land-fx.constants';
import { range, shouldSpawnBat, type Rng } from '../land-fx-selection';
import type { LandFxLayer } from './types';

const COLORS = LAND_FX_COLORS.halloween;
const BAT = {
  DELAY: 0.06,
  FLIGHT: 1.0,
  RISE: 0.85,
  TRAVEL: 0.7,
  FLAP_SPEED: 34,
  SIZE: 1.2,
} as const;

interface BatResources {
  body: THREE.BufferGeometry;
  wing: THREE.BufferGeometry;
  eye: THREE.BufferGeometry;
  skin: THREE.MeshBasicMaterial;
  eyes: THREE.MeshBasicMaterial;
}

let shared: BatResources | null = null;

function createWingGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.012);
  shape.quadraticCurveTo(0.05, 0.05, 0.11, 0.03);
  shape.lineTo(0.1, 0.0);
  shape.quadraticCurveTo(0.085, -0.004, 0.075, -0.02);
  shape.quadraticCurveTo(0.06, -0.008, 0.045, -0.022);
  shape.quadraticCurveTo(0.03, -0.01, 0.012, -0.018);
  shape.lineTo(0, -0.01);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 3);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function getBatResources(): BatResources {
  if (!shared) {
    const body = new THREE.SphereGeometry(0.018, 6, 4);
    body.scale(1, 0.9, 1.5);
    shared = {
      body,
      wing: createWingGeometry(),
      eye: new THREE.SphereGeometry(0.004, 4, 3),
      skin: new THREE.MeshBasicMaterial({ color: COLORS.bat, side: THREE.DoubleSide }),
      eyes: new THREE.MeshBasicMaterial({ color: COLORS.batEye }),
    };
  }
  return shared;
}

export class BatLayer implements LandFxLayer {
  readonly object = new THREE.Group();
  private readonly bat = new THREE.Group();
  private readonly leftWing = new THREE.Group();
  private readonly rightWing = new THREE.Group();
  private active = false;
  private heading = 0;
  private bobPhase = 0;

  constructor() {
    const r = getBatResources();
    this.bat.add(new THREE.Mesh(r.body, r.skin));
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(r.eye, r.eyes);
      eye.position.set(side * 0.007, 0.006, 0.024);
      this.bat.add(eye);
    }
    this.rightWing.add(new THREE.Mesh(r.wing, r.skin));
    this.leftWing.add(new THREE.Mesh(r.wing, r.skin));
    this.leftWing.scale.x = -1;
    this.bat.add(this.leftWing, this.rightWing);
    this.object.add(this.bat);
    this.object.visible = false;
  }

  reset(rand: Rng): void {
    this.active = shouldSpawnBat(rand);
    this.heading = rand() * Math.PI * 2;
    this.bobPhase = range(rand, 0, Math.PI * 2);
    this.object.visible = false;
  }

  update(t: number): void {
    if (!this.active) return;
    const local = (t - BAT.DELAY) / BAT.FLIGHT;
    this.object.visible = local >= 0 && local < 1;
    if (!this.object.visible) return;
    const ease = 1 - Math.pow(1 - local, 1.6);
    const dist = ease * BAT.TRAVEL;
    const bob = Math.sin(local * 18 + this.bobPhase) * 0.03;
    this.bat.position.set(
      Math.sin(this.heading) * dist,
      0.04 + ease * BAT.RISE + bob,
      Math.cos(this.heading) * dist,
    );
    this.bat.rotation.set(-0.35, this.heading, Math.sin(local * 9) * 0.2);
    const flap = Math.sin(t * BAT.FLAP_SPEED) * 0.85 + 0.15;
    this.rightWing.rotation.z = flap;
    this.leftWing.rotation.z = -flap;
    const popIn = Math.min(1, local * 8);
    const shrink = local > 0.75 ? 1 - (local - 0.75) / 0.25 : 1;
    this.bat.scale.setScalar(Math.max(1e-3, BAT.SIZE * popIn * shrink));
  }

  dispose(): void {
    // Geometry and materials are shared across cards
  }
}
