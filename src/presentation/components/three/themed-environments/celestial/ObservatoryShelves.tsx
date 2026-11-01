'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  CELESTIAL_BOOK_COLORS,
  CELESTIAL_COLORS,
  CELESTIAL_LAYOUT,
} from '@/presentation/config/celestial-environment.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import {
  addSurfaceDetail,
  CandleCluster,
  createPbrMaterial,
  MatrixInstances,
  seededRandom,
  useDisposables,
  type CandlePlacement,
  type PropPlacement,
} from '../primitives';
import { composePart } from './celestial-geometry';
import { createBrassMaterial } from './celestial-materials';

const B = CELESTIAL_LAYOUT.BOOKCASE;
const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
const ASTROLABE_RADIUS = 0.26;
const GLOBE_RADIUS = 0.2;

interface ShelfLayout {
  frame: THREE.Matrix4[];
  books: THREE.Matrix4[];
  bookColors: string[];
  astrolabeDiscs: THREE.Matrix4[];
  astrolabeRings: THREE.Matrix4[];
  globes: THREE.Matrix4[];
  candles: CandlePlacement[];
}

/** Offsets a local shelf point into world space for a bookcase placement. */
function worldPoint(parent: PropPlacement, local: Vec3): Vec3 {
  const v = new THREE.Vector3(...local).applyMatrix4(composePart(parent, [0, 0, 0]));
  return [v.x, v.y, v.z];
}

/**
 * Computes every frame board, book, astrolabe and globe for all bookcases so
 * each kind renders in one instanced draw. Deterministic (seeded).
 */
function buildShelves(): ShelfLayout {
  const rand = seededRandom(57);
  const layout: ShelfLayout = { frame: [], books: [], bookColors: [], astrolabeDiscs: [], astrolabeRings: [], globes: [], candles: [] };
  const shelfGap = B.height / B.shelves;
  const halfW = B.width / 2;

  for (const [x, z, rotationY] of CELESTIAL_LAYOUT.BOOKCASES) {
    const parent: PropPlacement = { position: [x, FLOOR, z], rotationY };
    // Frame: sides, back, top and shelf boards (unit box scaled per part)
    layout.frame.push(
      composePart(parent, [-halfW, B.height / 2, 0], [0, 0, 0], [B.board, B.height, B.depth]),
      composePart(parent, [halfW, B.height / 2, 0], [0, 0, 0], [B.board, B.height, B.depth]),
      composePart(parent, [0, B.height / 2, -B.depth / 2 + 0.02], [0, 0, 0], [B.width, B.height, 0.04]),
    );
    for (let s = 0; s <= B.shelves; s++) {
      layout.frame.push(composePart(parent, [0, s * shelfGap + B.board / 2, 0], [0, 0, 0], [B.width, B.board, B.depth]));
    }

    for (let s = 0; s < B.shelves; s++) {
      const shelfY = s * shelfGap + B.board;
      // Each shelf: a run of books, then a curio (astrolabe or globe) in the gap
      const curioOnLeft = (s + Math.round(x)) % 2 === 0;
      let cursor = curioOnLeft ? -halfW + 0.75 : -halfW + 0.12;
      for (let b = 0; b < CELESTIAL_LAYOUT.BOOKS_PER_SHELF && cursor < halfW - (curioOnLeft ? 0.15 : 0.8); b++) {
        const thickness = 0.08 + rand() * 0.07;
        const height = shelfGap * (0.55 + rand() * 0.3);
        const lean = rand() > 0.85 ? 0.18 : 0;
        layout.books.push(
          composePart(parent, [cursor + thickness / 2, shelfY + height / 2, 0], [0, 0, lean], [thickness, height, B.depth * 0.75]),
        );
        layout.bookColors.push(CELESTIAL_BOOK_COLORS[Math.floor(rand() * CELESTIAL_BOOK_COLORS.length)]);
        cursor += thickness + 0.01;
      }
      const curioX = curioOnLeft ? -halfW + 0.38 : halfW - 0.4;
      if (s % 2 === 0) {
        const y = shelfY + ASTROLABE_RADIUS + 0.04;
        layout.astrolabeDiscs.push(composePart(parent, [curioX, y, 0], [Math.PI / 2, 0, 0]));
        layout.astrolabeRings.push(composePart(parent, [curioX, y, 0.02]));
      } else {
        layout.globes.push(composePart(parent, [curioX, shelfY + GLOBE_RADIUS + 0.06, 0]));
      }
    }

    // Candles on top of the bookcase
    layout.candles.push(
      { position: worldPoint(parent, [-halfW + 0.35, B.height + B.board, 0]), scale: 1.3, height: 1.2 },
      { position: worldPoint(parent, [-halfW + 0.6, B.height + B.board, 0.05]), scale: 1.1, height: 0.7 },
      { position: worldPoint(parent, [halfW - 0.4, B.height + B.board, 0]), scale: 1.2, height: 1.5 },
    );
  }
  return layout;
}

/** Bookcases along the walls with tomes, brass astrolabes, small globes and candles. */
export function ObservatoryShelves() {
  const layout = useMemo(() => buildShelves(), []);
  const assets = useMemo(
    () => ({
      wood: createPbrMaterial('wood', { color: CELESTIAL_COLORS.wood, accent: CELESTIAL_COLORS.woodDark, seed: 57, roughness: 0.85 }),
      book: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }), { scale: 3, normalStrength: 0.35 }),
      brass: createBrassMaterial({ emissiveIntensity: 0.25, roughness: 0.3 }),
      globe: new THREE.MeshStandardMaterial({ color: '#2a3a8a', roughness: 0.5, emissive: '#101a50', emissiveIntensity: 0.4 }),
      box: new THREE.BoxGeometry(1, 1, 1),
      disc: new THREE.CylinderGeometry(ASTROLABE_RADIUS, ASTROLABE_RADIUS, 0.03, 20),
      ring: new THREE.TorusGeometry(ASTROLABE_RADIUS * 0.8, 0.018, 4, 24),
      sphere: new THREE.SphereGeometry(GLOBE_RADIUS, 14, 10),
    }),
    [],
  );
  useDisposables(assets);

  return (
    <group>
      <MatrixInstances geometry={assets.box} material={assets.wood} matrices={layout.frame} />
      <MatrixInstances geometry={assets.box} material={assets.book} matrices={layout.books} colors={layout.bookColors} />
      <MatrixInstances geometry={assets.disc} material={assets.brass} matrices={layout.astrolabeDiscs} />
      <MatrixInstances geometry={assets.ring} material={assets.brass} matrices={layout.astrolabeRings} />
      <MatrixInstances geometry={assets.sphere} material={assets.globe} matrices={layout.globes} />
      <CandleCluster
        candles={layout.candles}
        waxColor={CELESTIAL_COLORS.candleWax}
        flameColor={CELESTIAL_COLORS.candleFlame}
        glowColor={CELESTIAL_COLORS.candleGlow}
        glowStrength={0.5}
      />
    </group>
  );
}
