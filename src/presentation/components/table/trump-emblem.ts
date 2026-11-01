import * as THREE from 'three';
import { traceSuitGlyph } from '@/presentation/utils/card-textures/suit-glyphs';

/** The trump emblem in the middle of the table, in the indicator's local units (it is scaled 3x) */
export const TRUMP_EMBLEM = {
  /** Width of the glyph's em box */
  SIZE: 0.2,
  DEPTH: 0.035,
  BEVEL: { THICKNESS: 0.008, SIZE: 0.006, SEGMENTS: 2 },
  CURVE_SEGMENTS: 8,
  /** Height of the emblem's centre above the indicator's base */
  LIFT: 0.1,
  MATERIAL: { ROUGHNESS: 0.3, METALNESS: 0.6, EMISSIVE_INTENSITY: 0.25 },
} as const;

/**
 * The deck's suit symbol extruded into a solid emblem, from the same vector outline the card faces
 * draw (`suit-glyphs/`), so the table always shows the symbol of the deck in use. Centred on the
 * origin, standing upright in the XY plane. Null for a symbol without an outline.
 */
export function createTrumpEmblemGeometry(symbol: string): THREE.ExtrudeGeometry | null {
  const path = new THREE.ShapePath();
  // Glyphs are traced y down like a canvas; the scene is y up
  const traced = traceSuitGlyph(
    {
      moveTo: (x, y) => void path.moveTo(x, -y),
      lineTo: (x, y) => void path.lineTo(x, -y),
      bezierCurveTo: (...points: number[]) => {
        const [c1x, c1y, c2x, c2y, x, y] = points;
        path.bezierCurveTo(c1x, -c1y, c2x, -c2y, x, -y);
      },
      closePath: () => void path.currentPath?.closePath(),
    },
    symbol,
    TRUMP_EMBLEM.SIZE
  );
  if (!traced) return null;

  const geometry = new THREE.ExtrudeGeometry(path.toShapes(), {
    depth: TRUMP_EMBLEM.DEPTH,
    bevelEnabled: true,
    bevelThickness: TRUMP_EMBLEM.BEVEL.THICKNESS,
    bevelSize: TRUMP_EMBLEM.BEVEL.SIZE,
    bevelSegments: TRUMP_EMBLEM.BEVEL.SEGMENTS,
    curveSegments: TRUMP_EMBLEM.CURVE_SEGMENTS,
  });
  geometry.center();
  return geometry;
}
