import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ICard } from '@shared/domain';
import { CARD_SURFACE, DECK_FACE_ATLAS as A } from '@/presentation/config/card-render.config';
import { CARD_MATERIAL_SLOT, getCardGeometry } from '@/presentation/utils/card-geometry';
import { getCardTextureTierSpec, createCardTexture, peekCardFace, retainCardFace, releaseCardFace } from '@/presentation/utils/card-texture';
import { getStackedDeckCardLayout } from './stacked-deck-layout';

export interface DeckCardPlacement { card: ICard; layout: ReturnType<typeof getStackedDeckCardLayout>; }

/** Fronts share one atlas; backs and edges share the ordinary card-back material. */
export function createStackedDeckMesh(cards: readonly DeckCardPlacement[]) {
  const tier = getCardTextureTierSpec();
  const tileWidth = Math.round(tier.width * A.RESOLUTION_SCALE);
  const tileHeight = Math.round(tier.height * A.RESOLUTION_SCALE);
  const columns = Math.min(A.COLUMNS, Math.max(1, cards.length));
  const width = columns * (tileWidth + 2 * A.GUTTER);
  const height = Math.max(1, Math.ceil(cards.length / columns)) * (tileHeight + 2 * A.GUTTER);
  const canvas = typeof document === 'undefined' ? null : document.createElement('canvas');
  if (canvas) { canvas.width = width; canvas.height = height; }
  const texture = canvas ? new THREE.CanvasTexture(canvas) : new THREE.Texture();
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: CARD_SURFACE.FACE_ROUGHNESS, metalness: CARD_SURFACE.FACE_METALNESS });
  const source = getCardGeometry();
  const parts = (slot: number) => cards.map(({ layout }, i) => {
    const geometry = source.clone();
    const index = source.getIndex();
    if (!index) throw new Error('Card geometry must be indexed');
    const indices = source.groups.filter(group => group.materialIndex === slot).flatMap(group => Array.from({ length: group.count }, (_, n) => index.getX(group.start + n)));
    geometry.setIndex(indices);
    geometry.clearGroups();
    const pose = new THREE.Matrix4().compose(new THREE.Vector3(...layout.position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...layout.rotation)), new THREE.Vector3().setScalar(layout.scale));
    geometry.applyMatrix4(pose);
    if (slot === CARD_MATERIAL_SLOT.FRONT) {
      const uv = geometry.getAttribute('uv');
      const x = (i % columns) * (tileWidth + 2 * A.GUTTER) + A.GUTTER;
      const y = Math.floor(i / columns) * (tileHeight + 2 * A.GUTTER) + A.GUTTER;
      for (let v = 0; v < uv.count; v++) uv.setXY(v, (x + uv.getX(v) * tileWidth) / width, 1 - (y + (1 - uv.getY(v)) * tileHeight) / height);
    }
    return geometry;
  });
  const merge = (slot: number) => {
    const geometries = parts(slot);
    const merged = geometries.length ? mergeGeometries(geometries, false) : new THREE.BufferGeometry();
    geometries.forEach(g => g.dispose());
    if (!merged) throw new Error('Collected-card geometry could not be merged');
    return merged;
  };
  const front = merge(CARD_MATERIAL_SLOT.FRONT);
  const back = merge(CARD_MATERIAL_SLOT.BACK);
  return {
    front, back, material, texture,
    paint(themeVersion: string, anisotropy: number) {
      texture.anisotropy = anisotropy;
      const context = canvas?.getContext('2d');
      if (!context || !canvas) return;
      cards.forEach(({ card }, i) => {
        const face = peekCardFace(card, themeVersion, createCardTexture);
        retainCardFace(face);
        try {
          const x = (i % columns) * (tileWidth + 2 * A.GUTTER) + A.GUTTER;
          const y = Math.floor(i / columns) * (tileHeight + 2 * A.GUTTER) + A.GUTTER;
          context.drawImage(face.texture.image as CanvasImageSource, x, y, tileWidth, tileHeight);
          context.drawImage(canvas, x, y, tileWidth, 1, x, y - 1, tileWidth, 1);
          context.drawImage(canvas, x, y + tileHeight - 1, tileWidth, 1, x, y + tileHeight, tileWidth, 1);
          context.drawImage(canvas, x, y, 1, tileHeight, x - 1, y, 1, tileHeight);
          context.drawImage(canvas, x + tileWidth - 1, y, 1, tileHeight, x + tileWidth, y, 1, tileHeight);
        } finally { releaseCardFace(face); }
      });
      texture.needsUpdate = true;
    },
    dispose() { front.dispose(); back.dispose(); material.dispose(); texture.dispose(); },
  };
}
