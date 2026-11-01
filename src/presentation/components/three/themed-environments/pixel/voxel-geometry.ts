import * as THREE from 'three';

/**
 * Voxel mesh builder: samples a grid and emits only the faces between a
 * filled cell and an empty one, with per-face vertex colours. The result is
 * a single low-poly geometry (one draw call per model, instanceable).
 */

/** Returns a colour (any THREE.ColorRepresentation string) or null for empty */
export type VoxelSampler = (x: number, y: number, z: number) => string | null;

export interface VoxelModel {
  size: [number, number, number];
  sample: VoxelSampler;
}

/** 'base' puts y = 0 at the bottom (floor props); 'center' centres all axes */
export type VoxelAnchor = 'base' | 'center';

const FACES: ReadonlyArray<{ dir: [number, number, number]; corners: ReadonlyArray<[number, number, number]>; shade: number }> = [
  { dir: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.86 },
  { dir: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.86 },
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1 },
  { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.6 },
  { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.95 },
  { dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.95 },
];

/** Builds a non-indexed geometry with position, normal and color attributes. */
export function buildVoxelGeometry(model: VoxelModel, anchor: VoxelAnchor = 'base'): THREE.BufferGeometry {
  const [nx, ny, nz] = model.size;
  const grid: (string | null)[] = new Array(nx * ny * nz);
  for (let y = 0; y < ny; y++) for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) grid[(y * nz + z) * nx + x] = model.sample(x, y, z);
  const at = (x: number, y: number, z: number) =>
    x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz ? null : grid[(y * nz + z) * nx + x];

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const color = new THREE.Color();
  const origin: [number, number, number] = [nx / 2, anchor === 'center' ? ny / 2 : 0, nz / 2];

  /** Emits the exposed faces of one filled cell */
  const emitCell = (x: number, y: number, z: number, cell: string) => {
    for (const face of FACES) {
      if (at(x + face.dir[0], y + face.dir[1], z + face.dir[2])) continue;
      color.set(cell).multiplyScalar(face.shade);
      const [a, b, c, d] = face.corners;
      for (const corner of [a, b, c, a, c, d]) {
        positions.push(x + corner[0] - origin[0], y + corner[1] - origin[1], z + corner[2] - origin[2]);
        normals.push(...face.dir);
        colors.push(color.r, color.g, color.b);
      }
    }
  };

  for (let y = 0; y < ny; y++) {
    for (let z = 0; z < nz; z++) {
      for (let x = 0; x < nx; x++) {
        const cell = at(x, y, z);
        if (cell) emitCell(x, y, z, cell);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

/** Extrudes a 2D char map (top row first) `depth` voxels along z. */
export function extrudeSprite(rows: readonly string[], palette: Readonly<Record<string, string>>, depth = 1): VoxelModel {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  return {
    size: [width, height, depth],
    sample: (x, y) => palette[rows[height - 1 - y][x]] ?? null,
  };
}
