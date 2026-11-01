import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { OCCLUSION_PROBE } from '../../config/sandbox-budgets.config';
import { probeTableOcclusion } from './scene-screen-model';

function table() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 6, 6);
  camera.lookAt(0, 0, 0);
  scene.add(camera);
  return { scene, camera };
}

/** A 4-unit cube half way between the camera and the felt: every sight line passes through it. */
function blocker(scene: THREE.Scene, name: string, material: THREE.Material = new THREE.MeshBasicMaterial()): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), material);
  mesh.name = name;
  mesh.position.set(0, 3, 3);
  scene.add(mesh);
  scene.updateMatrixWorld();
  return mesh;
}

const RAYS = OCCLUSION_PROBE.TABLE_RING_POINTS + 1;

describe('probeTableOcclusion', () => {
  it('should see the whole felt over an empty table', () => {
    const { scene, camera } = table();
    scene.updateMatrixWorld();
    expect(probeTableOcclusion(scene, camera)).toEqual({ rays: RAYS, blocked: 0, occluders: [] });
  });

  it('should report solid geometry between the camera and the felt', () => {
    const { scene, camera } = table();
    blocker(scene, 'chandelier');
    const result = probeTableOcclusion(scene, camera);
    expect(result.blocked).toBe(RAYS);
    expect(result.occluders).toEqual(['chandelier']);
  });

  it('should never count cards as occluders: they are what the player looks at', () => {
    const { scene, camera } = table();
    blocker(scene, 'played-card:WIZARD-0');
    expect(probeTableOcclusion(scene, camera).blocked).toBe(0);
  });

  it('should look through translucent and hidden geometry', () => {
    const { scene, camera } = table();
    blocker(scene, 'glass', new THREE.MeshBasicMaterial({ transparent: true, opacity: OCCLUSION_PROBE.MIN_OCCLUDER_OPACITY / 2 }));
    blocker(scene, 'hidden').visible = false;
    expect(probeTableOcclusion(scene, camera).blocked).toBe(0);
  });
});
