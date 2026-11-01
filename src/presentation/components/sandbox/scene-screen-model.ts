import * as THREE from 'three';
import { TABLE_SURFACE } from '../../config/card-physics';
import { OCCLUSION_PROBE } from '../../config/sandbox-budgets.config';
import { parseSceneObjectName } from '../three/scene-object-names';
import { isDecorativeText } from '../three/scene-text-roles';
import { isSceneText } from './scene-inventory';
import { isVisibleInScene, projectBounds } from './scene-sampler';
import { ndcToClientRect, rectHeight, rectWidth, type ScreenRect } from './screen-geometry';
import type { SandboxSceneBridge } from './scene-bridge';

export interface HandCardOnScreen {
  cardId: string;
  rect: ScreenRect;
  /** Opacity of the card body (1 when its materials are opaque). */
  opacity: number;
}

export interface SceneTextOnScreen {
  text: string;
  rect: ScreenRect | null;
  /** Projected height of one em (the glyph box) in CSS px, foreshortening included. */
  emPx: number;
}

export interface OcclusionResult {
  rays: number;
  blocked: number;
  occluders: string[];
}

/** What the camera shows, in screen terms: the input the playability checks judge. */
export interface SceneScreenModel {
  hand: HandCardOnScreen[];
  played: Array<{ cardId: string; rect: ScreenRect }>;
  texts: SceneTextOnScreen[];
  /** Point clouds drawn without a sprite texture, which render as hard squares. */
  squareParticles: string[];
  occlusion: OcclusionResult;
}

type MaterialLike = THREE.Material & { map?: THREE.Texture | null; alphaMap?: THREE.Texture | null };

function materialsOf(object: THREE.Object3D): MaterialLike[] {
  const material = (object as THREE.Mesh).material as MaterialLike | MaterialLike[] | undefined;
  if (!material) return [];
  return Array.isArray(material) ? material : [material];
}

function effectiveOpacity(material: MaterialLike): number {
  return material.transparent ? material.opacity : 1;
}

/** The card body is the hand-card group's first mesh child (overlays such as glows come later). */
function bodyOpacity(card: THREE.Object3D): number {
  const body = card.children.find((child) => (child as THREE.Mesh).isMesh);
  const materials = body ? materialsOf(body) : [];
  return materials.length > 0 ? Math.min(...materials.map(effectiveOpacity)) : 1;
}

function canvasRect(bridge: SandboxSceneBridge): ScreenRect {
  const { left, top, right, bottom } = bridge.canvas.getBoundingClientRect();
  return { left, top, right, bottom };
}

/** Projected em height: the glyph box's local Y axis (fontSize long) as the camera sees it. */
function projectedEmPx(text: THREE.Mesh & { fontSize: number }, camera: THREE.Camera, canvas: ScreenRect): number {
  const base = text.localToWorld(new THREE.Vector3(0, 0, 0)).project(camera);
  const top = text.localToWorld(new THREE.Vector3(0, text.fontSize, 0)).project(camera);
  // NDC spans 2 units across the canvas on each axis.
  return Math.hypot(((top.x - base.x) / 2) * rectWidth(canvas), ((top.y - base.y) / 2) * rectHeight(canvas));
}

function inFrontAndInView(object: THREE.Object3D, camera: THREE.Camera): boolean {
  const ndc = object.getWorldPosition(new THREE.Vector3()).project(camera);
  return ndc.z > -1 && ndc.z < 1 && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1;
}

function textOnScreen(object: THREE.Mesh & { text: string; fontSize: number }, bridge: SandboxSceneBridge, canvas: ScreenRect): SceneTextOnScreen | null {
  const opacity = Math.min(...materialsOf(object).map((material) => material.opacity));
  if (!object.text.trim() || opacity < 0.05 || !inFrontAndInView(object, bridge.camera)) return null;
  const ndc = projectBounds(object, bridge.camera);
  return {
    text: object.text.slice(0, 24),
    rect: ndc ? ndcToClientRect(ndc, canvas) : null,
    emPx: projectedEmPx(object, bridge.camera, canvas),
  };
}

/** Raycasts from the camera to the felt (centre and a ring through the trick area). */
export function probeTableOcclusion(scene: THREE.Scene, camera: THREE.Camera): OcclusionResult {
  const origin = camera.getWorldPosition(new THREE.Vector3());
  const targets = [new THREE.Vector3(0, TABLE_SURFACE.CARD_REST_Y, 0)];
  for (let index = 0; index < OCCLUSION_PROBE.TABLE_RING_POINTS; index++) {
    const angle = (index / OCCLUSION_PROBE.TABLE_RING_POINTS) * Math.PI * 2;
    targets.push(new THREE.Vector3(Math.cos(angle) * OCCLUSION_PROBE.TABLE_RING_RADIUS, TABLE_SURFACE.CARD_REST_Y, Math.sin(angle) * OCCLUSION_PROBE.TABLE_RING_RADIUS));
  }
  const raycaster = new THREE.Raycaster();
  raycaster.layers.mask = camera.layers.mask;
  // Sprites can only be raycast with a camera; without one three.js logs a console error.
  raycaster.camera = camera;
  const occluders = new Set<string>();
  let blocked = 0;
  for (const target of targets) {
    const direction = target.clone().sub(origin);
    const distance = direction.length();
    raycaster.set(origin, direction.normalize());
    raycaster.far = Math.max(0, distance - OCCLUSION_PROBE.NEAR_TARGET_UNITS);
    const hit = raycaster.intersectObject(scene, true).find((candidate) => isOccluder(candidate.object));
    if (!hit) continue;
    blocked++;
    occluders.add(describeObject(hit.object));
  }
  return { rays: targets.length, blocked, occluders: [...occluders] };
}

/**
 * Solid, visible geometry that is not game content: cards (the hand, cards in flight, on the
 * table or on the deck) are what the player looks at, never what blocks the view.
 */
function isOccluder(object: THREE.Object3D): boolean {
  if (!(object as THREE.Mesh).isMesh || !isVisibleInScene(object) || isSceneText(object)) return false;
  for (let current: THREE.Object3D | null = object; current; current = current.parent) {
    if (current.name && parseSceneObjectName(current.name)) return false;
  }
  return materialsOf(object).some((material) => material.visible && effectiveOpacity(material) >= OCCLUSION_PROBE.MIN_OCCLUDER_OPACITY);
}

function describeObject(object: THREE.Object3D): string {
  const path: string[] = [];
  for (let current: THREE.Object3D | null = object; current && path.length < 3; current = current.parent) {
    if (current.name) path.push(current.name);
  }
  return path.length > 0 ? path.join(' < ') : `${object.type}#${object.id}`;
}

function isSquareParticles(object: THREE.Object3D): boolean {
  if (!(object as THREE.Points).isPoints) return false;
  return materialsOf(object).some((material) => (material as THREE.PointsMaterial).isPointsMaterial === true && !material.map && !material.alphaMap);
}

/** Builds the screen model of the frame the bridge's camera shows now. */
export function buildSceneScreenModel(bridge: SandboxSceneBridge): SceneScreenModel {
  const { scene, camera } = bridge;
  const canvas = canvasRect(bridge);
  scene.updateMatrixWorld();
  const model: SceneScreenModel = { hand: [], played: [], texts: [], squareParticles: [], occlusion: probeTableOcclusion(scene, camera) };

  scene.traverse((object) => {
    if (!isVisibleInScene(object)) return;
    const parsed = object.name ? parseSceneObjectName(object.name) : null;
    if (parsed?.kind === 'hand-card' || parsed?.kind === 'played-card') {
      const ndc = projectBounds(object, camera);
      if (!ndc) return;
      const rect = ndcToClientRect(ndc, canvas);
      if (parsed.kind === 'hand-card') model.hand.push({ cardId: parsed.cardId, rect, opacity: bodyOpacity(object) });
      else model.played.push({ cardId: parsed.cardId, rect });
      return;
    }
    if (isSceneText(object)) {
      if (isDecorativeText(object)) return;
      const text = textOnScreen(object, bridge, canvas);
      if (text) model.texts.push(text);
    } else if (isSquareParticles(object)) {
      model.squareParticles.push(describeObject(object));
    }
  });
  return model;
}
