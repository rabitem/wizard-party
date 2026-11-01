import type { Object3D, Skeleton, SkinnedMesh } from 'three';

/*
 * three.js keeps each skinned mesh's bone matrices in a float texture and uploads it on every frame
 * the mesh renders, whether the pose changed or not. A figure would upload one texture per part
 * mesh per frame: a resting table would never be quiet. So every part of a figure shares one
 * skeleton, and a held pose stops updating it after the pose is in place.
 */

/** Opens and closes a figure's bone uploads. */
export interface PoseGate {
  /** The pose is final: upload it once more, then skip the bone uploads. */
  hold(): void;
  /** The figure moves again: upload every frame. */
  release(): void;
  /** Frees the bone textures (on unmount). */
  dispose(): void;
}

/** Same bones in the same order with the same bind pose: one skeleton can drive both meshes. */
function bindsAlike(a: Skeleton, b: Skeleton): boolean {
  return a.bones.length === b.bones.length
    && a.bones.every((bone, index) => bone === b.bones[index])
    && a.boneInverses.every((inverse, index) => inverse.equals(b.boneInverses[index]));
}

/** Shares one skeleton among a cloned figure's meshes where they bind alike, and gates its uploads. */
export function prepareSkeletons(figure: Object3D): PoseGate {
  const meshes: SkinnedMesh[] = [];
  figure.traverse((object) => {
    if ((object as SkinnedMesh).isSkinnedMesh) meshes.push(object as SkinnedMesh);
  });
  const shared = meshes[0]?.skeleton;
  for (const mesh of meshes.slice(1)) {
    if (shared && bindsAlike(mesh.skeleton, shared)) mesh.skeleton = shared;
  }

  const skeletons = new Set(meshes.map((mesh) => mesh.skeleton));
  let held = false;
  const pending = new Set<Skeleton>();
  for (const skeleton of skeletons) {
    const update = skeleton.update.bind(skeleton);
    skeleton.update = () => {
      if (held && !pending.delete(skeleton)) return;
      update();
    };
  }

  return {
    hold: () => {
      held = true;
      skeletons.forEach((skeleton) => pending.add(skeleton));
    },
    release: () => {
      held = false;
      pending.clear();
    },
    dispose: () => skeletons.forEach((skeleton) => skeleton.dispose()),
  };
}
