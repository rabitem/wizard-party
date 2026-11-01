import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { AMBIENT_USER_DATA } from './ambient';
import { hasAwakeDynamicBodies } from './physics-activity';
import { SceneMotionMonitor } from './scene-motion-monitor';

function sceneWith(...objects: THREE.Object3D[]): THREE.Scene {
  const scene = new THREE.Scene();
  scene.add(...objects);
  scene.updateMatrixWorld(true);
  return scene;
}

describe('SceneMotionMonitor', () => {
  it('should report a still scene as still after the first sample', () => {
    const monitor = new SceneMotionMonitor(0.1);
    const scene = sceneWith(new THREE.Mesh());
    expect(monitor.sample(scene, 0)).toBe(true);
    expect(monitor.sample(scene, 16)).toBe(false);
  });

  it('should see an object that moved faster than the threshold', () => {
    const monitor = new SceneMotionMonitor(0.1);
    const card = new THREE.Mesh();
    const scene = sceneWith(card);
    monitor.sample(scene, 0);

    card.position.x = 0.05;
    scene.updateMatrixWorld(true);

    expect(monitor.sample(scene, 16)).toBe(true);
  });

  it('should ignore drift slower than the threshold', () => {
    const monitor = new SceneMotionMonitor(0.1);
    const card = new THREE.Mesh();
    const scene = sceneWith(card);
    monitor.sample(scene, 0);

    card.position.y = 0.0005; // 0.03 units/s at 60 Hz
    scene.updateMatrixWorld(true);

    expect(monitor.sample(scene, 16)).toBe(false);
  });

  it('should ignore motion inside ambient subtrees', () => {
    const monitor = new SceneMotionMonitor(0.1);
    const decor = new THREE.Group();
    Object.assign(decor.userData, AMBIENT_USER_DATA);
    const sparkle = new THREE.Mesh();
    decor.add(sparkle);
    const scene = sceneWith(decor);
    monitor.sample(scene, 0);

    sparkle.position.y = 1;
    scene.updateMatrixWorld(true);

    expect(monitor.sample(scene, 16)).toBe(false);
  });

  it('should see objects appearing or disappearing', () => {
    const monitor = new SceneMotionMonitor(0.1);
    const scene = sceneWith(new THREE.Mesh());
    monitor.sample(scene, 0);
    monitor.sample(scene, 16);

    scene.add(new THREE.Mesh());
    scene.updateMatrixWorld(true);

    expect(monitor.sample(scene, 32)).toBe(true);
  });

  it('should see instance matrix updates and camera moves', () => {
    const monitor = new SceneMotionMonitor(0.1);
    const chips = new THREE.InstancedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial(), 2);
    const camera = new THREE.PerspectiveCamera();
    const scene = sceneWith(chips);
    monitor.sample(scene, 0, camera);
    monitor.sample(scene, 16, camera);

    chips.instanceMatrix.needsUpdate = true;
    expect(monitor.sample(scene, 32, camera)).toBe(true);

    camera.position.z = 2;
    camera.updateMatrixWorld(true);
    expect(monitor.sample(scene, 48, camera)).toBe(true);
    expect(monitor.sample(scene, 64, camera)).toBe(false);
  });
});

describe('hasAwakeDynamicBodies', () => {
  it('should only count awake dynamic bodies, not kinematic ones', () => {
    const world = (bodies: { isDynamic(): boolean }[]) => ({
      forEachActiveRigidBody: (callback: (body: { isDynamic(): boolean }) => void) => bodies.forEach(callback),
    });
    expect(hasAwakeDynamicBodies(world([]))).toBe(false);
    expect(hasAwakeDynamicBodies(world([{ isDynamic: () => false }]))).toBe(false);
    expect(hasAwakeDynamicBodies(world([{ isDynamic: () => false }, { isDynamic: () => true }]))).toBe(true);
  });
});
