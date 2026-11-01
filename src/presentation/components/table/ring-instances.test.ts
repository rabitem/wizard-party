import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ringInstanceMatrices } from './ring-instances';

/** World matrix of the old per-copy JSX: <group position rotation><mesh position rotation /></group> */
function nestedObjectMatrix(
  slot: { position: THREE.Vector3Tuple; rotation: THREE.Vector3Tuple },
  part: { position: THREE.Vector3Tuple; rotation: THREE.Vector3Tuple }
): THREE.Matrix4 {
  const group = new THREE.Group();
  group.position.set(...slot.position);
  group.rotation.set(...slot.rotation);
  const mesh = new THREE.Object3D();
  mesh.position.set(...part.position);
  mesh.rotation.set(...part.rotation);
  group.add(mesh);
  group.updateMatrixWorld(true);
  return mesh.matrixWorld;
}

function expectMatrixClose(actual: THREE.Matrix4, expected: THREE.Matrix4): void {
  actual.elements.forEach((value, i) => expect(value).toBeCloseTo(expected.elements[i], 9));
}

describe('ringInstanceMatrices', () => {
  it('should create one matrix per copy, evenly spaced on the ring', () => {
    const matrices = ringInstanceMatrices({ count: 4, radius: 2, y: 0.5 });
    const positions = matrices.map((m) => new THREE.Vector3().setFromMatrixPosition(m));

    expect(matrices).toHaveLength(4);
    expect(positions[0].toArray().map((v) => +v.toFixed(9))).toEqual([2, 0.5, 0]);
    expect(positions[1].toArray().map((v) => +v.toFixed(9))).toEqual([0, 0.5, 2]);
  });

  it('should match the nested group/mesh transforms of the per-mesh version (stitches, studs)', () => {
    const layout = { count: 24, radius: 3.5, y: 0.08 };
    const part = { position: [0, -0.005, 0] as THREE.Vector3Tuple, rotation: [-Math.PI / 2, 0, 0] as THREE.Vector3Tuple };
    const matrices = ringInstanceMatrices(layout, part);

    [0, 5, 23].forEach((i) => {
      const angle = (i / layout.count) * Math.PI * 2;
      const expected = nestedObjectMatrix(
        { position: [Math.cos(angle) * layout.radius, layout.y, Math.sin(angle) * layout.radius], rotation: [0, 0, 0] },
        part
      );
      expectMatrixClose(matrices[i], expected);
    });
  });

  it('should apply the angle offset and outward yaw (cup holders, apron inlays)', () => {
    const layout = { count: 12, radius: 3.72, y: -0.06, angleOffset: Math.PI / 12, faceOutward: true };
    const part = { position: [0, 0, 0.001] as THREE.Vector3Tuple, rotation: [0, 0, Math.PI / 4] as THREE.Vector3Tuple };
    const matrices = ringInstanceMatrices(layout, part);

    [0, 7].forEach((i) => {
      const angle = (i / layout.count) * Math.PI * 2 + layout.angleOffset;
      const expected = nestedObjectMatrix(
        {
          position: [Math.cos(angle) * layout.radius, layout.y, Math.sin(angle) * layout.radius],
          rotation: [0, -angle + Math.PI / 2, 0],
        },
        part
      );
      expectMatrixClose(matrices[i], expected);
    });
  });
});
