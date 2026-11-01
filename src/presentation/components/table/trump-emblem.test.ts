import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { CARD_THEMES } from '@/presentation/components/settings/card-theme-presets';
import { TRUMP_EMBLEM, createTrumpEmblemGeometry } from './trump-emblem';

const DECK_SUITS = CARD_THEMES.flatMap((theme) =>
  Object.entries(theme.suits).map(([suitKey, suit]) => ({ themeId: theme.id, suitKey, symbol: suit.canvasSymbol }))
);

/** Glyphs fill about -0.5..0.5 of the em box; sun rays and bevelled star points reach a bit beyond */
const EM_BOX_OVERSHOOT = 1.15;

/** The emblem for a deck symbol; every deck symbol must have one */
function emblemFor(symbol: string): THREE.ExtrudeGeometry {
  const geometry = createTrumpEmblemGeometry(symbol);
  if (!geometry) throw new Error(`no trump emblem for ${symbol}`);
  return geometry;
}

function boundsOf(geometry: THREE.BufferGeometry): THREE.Box3 {
  geometry.computeBoundingBox();
  return geometry.boundingBox ?? new THREE.Box3();
}

describe('createTrumpEmblemGeometry', () => {
  it.each(DECK_SUITS)('should build a solid, centred emblem for $themeId $suitKey ($symbol)', ({ symbol }) => {
    const geometry = emblemFor(symbol);
    const bounds = boundsOf(geometry);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());

    expect(geometry.getAttribute('position').count).toBeGreaterThan(0);
    // Upright and about one em box across (the bevel pushes sharp star points a little past it),
    // as deep as the extrusion
    expect(Math.max(size.x, size.y)).toBeGreaterThan(TRUMP_EMBLEM.SIZE / 2);
    expect(Math.max(size.x, size.y)).toBeLessThanOrEqual(TRUMP_EMBLEM.SIZE * EM_BOX_OVERSHOOT);
    expect(size.z).toBeCloseTo(TRUMP_EMBLEM.DEPTH + 2 * TRUMP_EMBLEM.BEVEL.THICKNESS, 6);
    expect(center.length()).toBeCloseTo(0, 6);
    geometry.dispose();
  });

  it('should keep the glyph upright (canvas y down becomes scene y up)', () => {
    // Upright, the spade's highest point is its tip on the centre line; upside down it would be
    // a corner of the wide stem base
    const geometry = emblemFor('♠');
    const positions = geometry.getAttribute('position');
    let topY = -Infinity;
    let xAtTop = 0;
    for (let i = 0; i < positions.count; i++) {
      if (positions.getY(i) > topY) {
        topY = positions.getY(i);
        xAtTop = positions.getX(i);
      }
    }
    expect(Math.abs(xAtTop)).toBeLessThan(TRUMP_EMBLEM.SIZE * 0.1);
    geometry.dispose();
  });
});
