'use client';

import * as THREE from 'three';
import { CardType, type ICard } from '@shared/domain';
import { CARD_SURFACE } from '@/presentation/config/card-render.config';
import { CARD_MATERIAL_SLOT } from '../card-geometry';
import { applyCardRenderMode, type CardRenderMode } from '../card-render-state';
import { cardThemeVersionOf, getActiveCardTheme, getCardThemeSnapshot } from '../card-theme-store';
import { getCardBackTexture, isSharedCardBackTexture } from './card-back-texture';
import { createCardTexture } from './card-face-texture';
import { peekCardFace, releaseCardFace, retainCardFace, type CardFaceHandle } from './card-face-texture-cache';

/**
 * Card mesh materials, indexed by CARD_MATERIAL_SLOT and drawn on the shared card geometry:
 * - FRONT: owned by the mesh (it carries the per-card tint), sampling the shared face texture;
 * - BACK (back + edges): one shared material per back texture and render mode.
 */
export type CardMaterial = THREE.MeshStandardMaterial;

export interface CreateCardMaterialsOptions {
  faceDown?: boolean;
  renderMode?: CardRenderMode;
}

const FACE_HANDLE_KEY = 'cardFace';
const SHARED_MATERIAL_KEY = 'sharedCardMaterial';
const sharedBackMaterials = new Map<string, CardMaterial>();

function shouldRenderCardFaceDown(card: ICard, explicitFaceDown = false): boolean {
  return explicitFaceDown ||
    (card.type === CardType.NUMBER && (card.suit === null || card.value === null));
}

function getSharedBackMaterial(texture: THREE.Texture, mode: CardRenderMode): CardMaterial {
  const key = `${texture.uuid}|${mode}`;
  let material = sharedBackMaterials.get(key);
  if (!material) {
    material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: CARD_SURFACE.BACK_ROUGHNESS,
      metalness: CARD_SURFACE.BACK_METALNESS,
    });
    applyCardRenderMode(material, mode);
    material.userData[SHARED_MATERIAL_KEY] = true;
    sharedBackMaterials.set(key, material);
  }
  return material;
}

function getFaceHandle(material: THREE.Material): CardFaceHandle | undefined {
  return material.userData[FACE_HANDLE_KEY] as CardFaceHandle | undefined;
}

/**
 * Materials for one card mesh. Takes no reference on the shared face, so it is safe to call
 * during render; call retainCardMaterials when the mesh commits and disposeCardMaterials when
 * it unmounts.
 */
export function buildCardMaterials(card: ICard, options: CreateCardMaterialsOptions = {}): CardMaterial[] {
  const mode = options.renderMode ?? 'table';
  const backTexture = getCardBackTexture(getActiveCardTheme().id);
  const back = getSharedBackMaterial(backTexture, mode);
  const face = shouldRenderCardFaceDown(card, options.faceDown)
    ? null
    : peekCardFace(card, cardThemeVersionOf(getCardThemeSnapshot()), (c) => createCardTexture(c));
  const front = new THREE.MeshStandardMaterial({
    map: face?.texture ?? backTexture,
    roughness: CARD_SURFACE.FACE_ROUGHNESS,
    metalness: CARD_SURFACE.FACE_METALNESS,
  });
  applyCardRenderMode(front, mode);
  if (face) front.userData[FACE_HANDLE_KEY] = face;

  const materials: CardMaterial[] = [];
  materials[CARD_MATERIAL_SLOT.FRONT] = front;
  materials[CARD_MATERIAL_SLOT.BACK] = back;
  return materials;
}

/** Take the face references of materials from buildCardMaterials (mesh committed) */
export function retainCardMaterials(materials: readonly CardMaterial[]): void {
  materials.forEach((material) => {
    const face = getFaceHandle(material);
    if (face) retainCardFace(face);
  });
}

/**
 * Release a mesh's materials: shared back materials stay, the face goes back to the face cache
 * (idle, still cached) and the mesh's own front material is disposed.
 */
export function disposeCardMaterials(materials: readonly CardMaterial[]): void {
  new Set(materials).forEach((material) => {
    if (material.userData[SHARED_MATERIAL_KEY]) return;
    const face = getFaceHandle(material);
    if (face) releaseCardFace(face);
    else if (material.map && !isSharedCardBackTexture(material.map)) material.map.dispose();
    material.dispose();
  });
}
