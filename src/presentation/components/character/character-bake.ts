import { Bone, BufferAttribute, BufferGeometry, Matrix3, Matrix4, Vector3, SkinnedMesh, type Material, type Mesh, type Object3D, type Skeleton } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/*
 * A figure is a dozen meshes: five skinned outfit pieces, a skinned head, and rigid props hung on
 * bones (hat, cape, hand items, familiar). Drawn as they are, every opponent at the table costs a
 * dozen draw calls. Baking merges the visible parts that share a material into one skinned mesh
 * on one skeleton: a figure draws in two or three calls.
 *
 * The KayKit skins all list the same 41 joints, but each part was bound in its own space: its
 * inverse bind matrices are the base skin's times one constant offset. A skinned part is moved
 * into the base skin's bind space; a rigid prop is bound to its nearest bone with full weight, so
 * it follows that bone exactly as it did as a child of it.
 */

const ATTRIBUTES = ['position', 'normal', 'uv', 'color'] as const;

interface BakeSource {
  geometry: BufferGeometry;
  /** Takes the part's own vertices into the merged mesh's bind space. */
  transform: Matrix4;
  /** Rigid props: the bone every vertex follows. Skinned parts keep their own weights. */
  bone: number | null;
}

/** Undoes a bake: the original meshes show again and the merged ones are freed. */
export interface FigureBake {
  dispose(): void;
}

function isShown(object: Object3D, root: Object3D): boolean {
  for (let current: Object3D | null = object; current && current !== root.parent; current = current.parent) {
    if (!current.visible) return false;
  }
  return true;
}

function nearestBone(object: Object3D, bones: readonly Bone[]): number | null {
  for (let current = object.parent; current; current = current.parent) {
    const index = bones.indexOf(current as Bone);
    if (index >= 0) return index;
  }
  return null;
}

function sameJoints(skeleton: Skeleton, base: Skeleton): boolean {
  return skeleton.bones.length === base.bones.length && skeleton.bones.every((bone, index) => bone === base.bones[index]);
}

/** A float copy of `source`'s attributes, moved by `transform` (normals by its normal matrix). */
function bakedGeometry({ geometry, transform, bone }: BakeSource, names: readonly string[]): BufferGeometry {
  const plain = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const count = plain.attributes.position.count;
  const normalMatrix = new Matrix3().getNormalMatrix(transform);
  const point = new Vector3();
  const result = new BufferGeometry();

  for (const name of names) {
    const source = plain.getAttribute(name);
    const size = source.itemSize;
    const values = new Float32Array(count * size);
    for (let i = 0; i < count; i++) {
      if (name === 'position' || name === 'normal') {
        point.fromBufferAttribute(source, i);
        if (name === 'position') point.applyMatrix4(transform);
        else point.applyMatrix3(normalMatrix).normalize();
        point.toArray(values, i * size);
      } else {
        for (let k = 0; k < size; k++) values[i * size + k] = source.getComponent(i, k);
      }
    }
    result.setAttribute(name, new BufferAttribute(values, size));
  }

  const skinIndex = new Float32Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  const joints = plain.getAttribute('skinIndex');
  const weights = plain.getAttribute('skinWeight');
  for (let i = 0; i < count; i++) {
    if (bone !== null || !joints || !weights) {
      skinIndex[i * 4] = bone ?? 0;
      skinWeight[i * 4] = 1;
      continue;
    }
    for (let k = 0; k < 4; k++) {
      skinIndex[i * 4 + k] = joints.getComponent(i, k);
      skinWeight[i * 4 + k] = weights.getComponent(i, k);
    }
  }
  result.setAttribute('skinIndex', new BufferAttribute(skinIndex, 4));
  result.setAttribute('skinWeight', new BufferAttribute(skinWeight, 4));
  plain.dispose();
  return result;
}

/** Collects the figure's visible parts by material, as bake sources in the base skin's bind space. */
function collectSources(figure: Object3D, base: SkinnedMesh) {
  const skeleton = base.skeleton;
  const toBind = new Matrix4().copy(base.bindMatrix).invert();
  const groups = new Map<Material, BakeSource[]>();
  const parts: Mesh[] = [];
  figure.updateMatrixWorld(true);
  figure.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material) || !isShown(mesh, figure)) return;
    let source: BakeSource | null = null;
    const skinned = mesh as SkinnedMesh;
    if (skinned.isSkinnedMesh) {
      if (!sameJoints(skinned.skeleton, skeleton)) return;
      // base⁻¹ · own is the same for every joint: compare the first one.
      const offset = new Matrix4().copy(skeleton.boneInverses[0]).invert().multiply(skinned.skeleton.boneInverses[0]);
      source = { geometry: mesh.geometry, transform: new Matrix4().multiplyMatrices(toBind, offset).multiply(skinned.bindMatrix), bone: null };
    } else {
      const bone = nearestBone(mesh, skeleton.bones);
      if (bone === null) return;
      const local = new Matrix4().copy(skeleton.bones[bone].matrixWorld).invert().multiply(mesh.matrixWorld);
      const boneBind = new Matrix4().copy(skeleton.boneInverses[bone]).invert();
      source = { geometry: mesh.geometry, transform: new Matrix4().multiplyMatrices(toBind, boneBind).multiply(local), bone };
    }
    const group = groups.get(mesh.material) ?? [];
    group.push(source);
    groups.set(mesh.material, group);
    parts.push(mesh);
  });
  return { groups, parts };
}

/**
 * Merges the figure's visible parts into one skinned mesh per material, driven by `base`'s
 * skeleton, and hides the parts. Parts it cannot merge (another rig, no bone above them) stay as
 * they are. Bake again after the visible parts change; dispose the previous bake first.
 */
export function bakeFigure(figure: Object3D): FigureBake {
  let base: SkinnedMesh | null = null;
  figure.traverse((object) => {
    if (!base && (object as SkinnedMesh).isSkinnedMesh) base = object as SkinnedMesh;
  });
  const anchor = base as SkinnedMesh | null;
  if (!anchor?.parent) return { dispose: () => undefined };

  const { groups, parts } = collectSources(figure, anchor);
  const merged: SkinnedMesh[] = [];
  for (const [material, sources] of groups) {
    const names = ATTRIBUTES.filter((name) => sources.every((source) => source.geometry.getAttribute(name)));
    const geometry = mergeGeometries(sources.map((source) => bakedGeometry(source, names)));
    if (!geometry) continue;
    const mesh = new SkinnedMesh(geometry, material);
    mesh.name = 'character-bake';
    // Animation moves the limbs beyond the bind pose's bounds; a figure is small enough to always draw.
    mesh.frustumCulled = false;
    anchor.parent.add(mesh);
    mesh.bind(anchor.skeleton, anchor.bindMatrix);
    merged.push(mesh);
  }
  if (merged.length === 0) return { dispose: () => undefined };
  parts.forEach((part) => {
    part.visible = false;
  });

  return {
    dispose: () => {
      parts.forEach((part) => {
        part.visible = true;
      });
      merged.forEach((mesh) => {
        mesh.removeFromParent();
        mesh.geometry.dispose();
      });
    },
  };
}
