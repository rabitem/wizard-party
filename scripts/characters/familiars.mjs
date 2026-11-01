/**
 * Familiars are our own low-poly models, built from three.js primitives: faceted (flat normals)
 * with per-vertex colours to sit next to the KayKit style. Each one stands beside the character's
 * left foot, facing forward (+Z), in rig units (the character is about 2.7 tall).
 */
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  Matrix4,
  Quaternion,
  TorusGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Where every familiar stands, relative to the rig root: beside the left foot, a little forward. */
export const FAMILIAR_PLACEMENT = { bone: 'root', position: [0.95, 0, 0.25], turnY: -0.35 };

const srgbToLinear = (channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
const linearColor = (hex) => [16, 8, 0].map((shift) => srgbToLinear(((hex >> shift) & 0xff) / 255));

/** One coloured, faceted piece: `geometry` placed by position, rotation (radians) and scale. */
function piece(geometry, hex, { at = [0, 0, 0], rotate = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  const matrix = new Matrix4().compose(new Vector3(...at), new Quaternion().setFromEuler(new Euler(...rotate)), new Vector3(...scale));
  const flat = geometry.toNonIndexed().applyMatrix4(matrix);
  flat.deleteAttribute('uv');
  flat.computeVertexNormals();
  const color = linearColor(hex);
  const colors = new Float32Array(flat.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) colors.set(color, i);
  flat.setAttribute('color', new flat.attributes.position.constructor(colors, 3));
  return flat;
}

/** Mirrors a piece builder to both sides (x and -x). */
const pair = (build) => [build(1), build(-1)];

const ball = (radius, detail = 1) => new IcosahedronGeometry(radius, detail);

function owl() {
  const brown = 0x8a5a3b;
  const light = 0xe8cfa5;
  return [
    piece(ball(0.2), brown, { at: [0, 0.24, 0], scale: [1, 1.15, 0.95] }),
    piece(ball(0.13), light, { at: [0, 0.2, 0.09], scale: [1, 1.2, 0.6] }),
    piece(ball(0.16), brown, { at: [0, 0.5, 0], scale: [1.1, 0.95, 1] }),
    ...pair((side) => piece(new ConeGeometry(0.05, 0.12, 4), brown, { at: [side * 0.11, 0.65, 0], rotate: [0, 0, side * -0.35] })),
    ...pair((side) => piece(ball(0.065), 0xfff6dc, { at: [side * 0.07, 0.52, 0.13] })),
    ...pair((side) => piece(ball(0.035), 0x1a1410, { at: [side * 0.07, 0.52, 0.18] })),
    piece(new ConeGeometry(0.03, 0.08, 4), 0xf0a020, { at: [0, 0.45, 0.17], rotate: [Math.PI / 2, 0, 0] }),
    ...pair((side) => piece(ball(0.12), 0x6e4630, { at: [side * 0.19, 0.27, -0.02], scale: [0.45, 1.1, 0.9] })),
    ...pair((side) => piece(new BoxGeometry(0.07, 0.04, 0.09), 0xf0a020, { at: [side * 0.07, 0.02, 0.05] })),
  ];
}

function raven() {
  const black = 0x23232e;
  return [
    piece(ball(0.16), black, { at: [0, 0.24, 0], scale: [0.9, 1, 1.35], rotate: [-0.35, 0, 0] }),
    piece(ball(0.12), black, { at: [0, 0.45, 0.12] }),
    piece(new ConeGeometry(0.035, 0.16, 4), 0x5d5d68, { at: [0, 0.44, 0.27], rotate: [Math.PI / 2, 0, 0] }),
    ...pair((side) => piece(ball(0.025), 0xf2d16b, { at: [side * 0.065, 0.48, 0.2] })),
    ...pair((side) => piece(ball(0.13), 0x1a1a24, { at: [side * 0.14, 0.27, -0.03], scale: [0.4, 0.9, 1.4], rotate: [-0.35, 0, 0] })),
    piece(new BoxGeometry(0.14, 0.03, 0.22), black, { at: [0, 0.16, -0.24], rotate: [0.5, 0, 0] }),
    ...pair((side) => piece(new CylinderGeometry(0.012, 0.012, 0.12, 4), 0x5d5d68, { at: [side * 0.05, 0.06, 0] })),
  ];
}

function cat() {
  const fur = 0xd98e48;
  const cream = 0xf3dcb8;
  return [
    piece(ball(0.2), fur, { at: [0, 0.2, -0.02], scale: [0.95, 1.05, 1.15] }),
    piece(ball(0.12), cream, { at: [0, 0.2, 0.12], scale: [1, 1.1, 0.6] }),
    piece(ball(0.17), fur, { at: [0, 0.48, 0.05], scale: [1.1, 0.95, 1] }),
    ...pair((side) => piece(new ConeGeometry(0.06, 0.12, 4), fur, { at: [side * 0.1, 0.62, 0.04], rotate: [0, Math.PI / 4, side * -0.2] })),
    ...pair((side) => piece(ball(0.035), 0x3fa66b, { at: [side * 0.065, 0.5, 0.2] })),
    piece(ball(0.02), 0xe58c9a, { at: [0, 0.45, 0.22] }),
    ...pair((side) => piece(ball(0.06), cream, { at: [side * 0.08, 0.04, 0.14], scale: [1, 0.6, 1.3] })),
    piece(new TorusGeometry(0.17, 0.035, 4, 8, Math.PI), fur, { at: [0.12, 0.17, -0.18], rotate: [0, Math.PI / 2, 0] }),
  ];
}

function toad() {
  const green = 0x5c9a3c;
  return [
    piece(ball(0.22), green, { at: [0, 0.14, 0], scale: [1.15, 0.65, 1] }),
    piece(ball(0.17), 0xd8d68a, { at: [0, 0.1, 0.07], scale: [1, 0.5, 0.9] }),
    ...pair((side) => piece(ball(0.07), green, { at: [side * 0.1, 0.27, 0.1] })),
    ...pair((side) => piece(ball(0.045), 0xf5e9a0, { at: [side * 0.1, 0.29, 0.15] })),
    ...pair((side) => piece(new BoxGeometry(0.07, 0.025, 0.012), 0x1a1410, { at: [side * 0.1, 0.29, 0.195] })),
    ...pair((side) => piece(ball(0.08), 0x4f8834, { at: [side * 0.2, 0.05, -0.05], scale: [0.8, 0.45, 1.3] })),
    ...pair((side) => piece(ball(0.05), 0x4f8834, { at: [side * 0.13, 0.03, 0.17], scale: [1, 0.45, 1] })),
    piece(new BoxGeometry(0.16, 0.012, 0.01), 0x2e4a1f, { at: [0, 0.13, 0.215] }),
  ];
}

const BUILDERS = { 'familiar:owl': owl, 'familiar:cat': cat, 'familiar:raven': raven, 'familiar:toad': toad };

/** Merged, faceted, vertex-coloured geometry per familiar part id. */
export function buildFamiliarGeometries() {
  return Object.entries(BUILDERS).map(([partId, build]) => {
    const pieces = build();
    const geometry = mergeGeometries(pieces);
    for (const used of pieces) used.dispose();
    return { partId, geometry };
  });
}
