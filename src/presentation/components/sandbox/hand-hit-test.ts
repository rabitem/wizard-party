import * as THREE from 'three';
import { projectBounds } from 'three-motion-audit/three';
import { parseSceneObjectName } from '../three/scene-object-names';
import { ndcToClientRect, rectHeight, rectWidth, type ScreenRect } from './screen-geometry';
import type { SandboxSceneBridge } from './scene-bridge';

export interface ClientPoint {
  x: number;
  y: number;
}

/** What a hit test needs from the scene bridge. */
export type HitTestBridge = Pick<SandboxSceneBridge, 'camera' | 'canvas' | 'scene' | 'findObject' | 'projectToClient'>;

/** Rows (share of the card's screen height from its top) and columns a tap may aim at. */
const TAP_ROWS = [0.5, 0.35, 0.65] as const;
const TAP_COLUMNS = 11;

function canvasRect(canvas: HTMLCanvasElement): ScreenRect {
  const { left, top, right, bottom } = canvas.getBoundingClientRect();
  return { left, top, right, bottom };
}

function owningHandCard(object: THREE.Object3D): string | null {
  for (let current: THREE.Object3D | null = object; current; current = current.parent) {
    const parsed = current.name ? parseSceneObjectName(current.name) : null;
    if (parsed?.kind === 'hand-card') return parsed.cardId;
  }
  return null;
}

function handCards(scene: THREE.Scene): THREE.Object3D[] {
  const cards: THREE.Object3D[] = [];
  scene.traverse((object) => {
    if (object.name && parseSceneObjectName(object.name)?.kind === 'hand-card') cards.push(object);
  });
  return cards;
}

/**
 * Which hand card a pointer at `point` lands on: the nearest one along the camera ray, as R3F's
 * event system picks it. Null when the point misses the hand.
 */
export function handCardAt(bridge: HitTestBridge, point: ClientPoint, cards: THREE.Object3D[] = handCards(bridge.scene)): string | null {
  const canvas = canvasRect(bridge.canvas);
  const width = rectWidth(canvas);
  const height = rectHeight(canvas);
  if (width === 0 || height === 0) return null;
  const ndc = new THREE.Vector2(((point.x - canvas.left) / width) * 2 - 1, -(((point.y - canvas.top) / height) * 2 - 1));
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, bridge.camera);
  const [nearest] = raycaster.intersectObjects(cards, true);
  return nearest ? owningHandCard(nearest.object) : null;
}

/**
 * Client point where a tap lands on `cardId` itself, as a player aims at the part of a card
 * they can see. In a fanned hand the neighbours cover most of each card, so the card's centre
 * often belongs to the next card; then the middle of the strip the card still shows is used.
 * Falls back to the centre when no part of the card is exposed (the tap then shows that).
 */
export function visibleHandCardPoint(bridge: HitTestBridge, cardId: string): ClientPoint | null {
  const card = bridge.findObject('hand-card', cardId);
  if (!card) return null;
  const centre = bridge.projectToClient(card.getWorldPosition(new THREE.Vector3()));
  const cards = handCards(bridge.scene);
  if (handCardAt(bridge, centre, cards) === cardId) return centre;

  const ndc = projectBounds(card, bridge.camera);
  if (!ndc) return centre;
  const rect = ndcToClientRect(ndc, canvasRect(bridge.canvas));
  for (const row of TAP_ROWS) {
    const y = rect.top + row * rectHeight(rect);
    const exposed: ClientPoint[] = [];
    for (let column = 0; column < TAP_COLUMNS; column++) {
      const point = { x: rect.left + ((column + 0.5) / TAP_COLUMNS) * rectWidth(rect), y };
      if (handCardAt(bridge, point, cards) === cardId) exposed.push(point);
    }
    if (exposed.length > 0) return exposed[Math.floor(exposed.length / 2)];
  }
  return centre;
}
