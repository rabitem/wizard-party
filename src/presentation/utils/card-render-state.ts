import type * as THREE from 'three';
import { CARD_STACKING } from '@/presentation/config/physics.config';

/**
 * How a card mesh is drawn:
 * - table: an ordinary lit, depth-tested object (played, collecting, deck, dragged cards);
 * - hand: the local hand, drawn after everything else in the scene (transparent pass, high
 *   render order) without depth test, so it is never hidden by the table or its effects. It is
 *   fully opaque (opacity 1); the transparent pass is only used for the draw order.
 */
export type CardRenderMode = 'table' | 'hand';

interface CardMaterialRenderState {
  transparent: boolean;
  depthTest: boolean;
  depthWrite: boolean;
}

const RENDER_STATES: Readonly<Record<CardRenderMode, CardMaterialRenderState>> = {
  table: { transparent: false, depthTest: true, depthWrite: true },
  hand: { transparent: true, depthTest: false, depthWrite: false },
};

/** Configure a freshly created card material for a render mode (set once, never per frame) */
export function applyCardRenderMode(material: THREE.Material, mode: CardRenderMode): void {
  const state = RENDER_STATES[mode];
  material.transparent = state.transparent;
  material.opacity = 1;
  material.depthTest = state.depthTest;
  material.depthWrite = state.depthWrite;
  material.alphaTest = 0;
}

/**
 * Render order of a hand card: above everything on the table, and later slots above earlier
 * ones, so overlapping cards stack in hand order without relying on depth.
 */
export function getHandCardRenderOrder(stackIndex: number): number {
  return CARD_STACKING.HAND_RENDER_ORDER + Math.max(0, stackIndex);
}
