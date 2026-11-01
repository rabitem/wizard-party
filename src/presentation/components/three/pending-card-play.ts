import * as THREE from 'three';
import { GamePhase } from '@shared/domain';
import { sceneObjectName, type SceneObjectKind } from './scene-object-names';
import type { PlayedCardOriginPose } from './physics-played-card.types';

/**
 * Phases in which the local player's latest play can still be on the table or collecting.
 * Any other phase means a new deal is under way, and card ids repeat between deals. A paused game
 * keeps its phase (the pause sits beside it), so a pause never drops a pending play.
 */
const PENDING_CARD_PLAY_PHASES: ReadonlySet<GamePhase> = new Set([
  GamePhase.PLAYING,
  GamePhase.ROUND_END,
  GamePhase.GAME_END,
]);

export function shouldKeepPendingCardPlay(phase: GamePhase): boolean {
  return PENDING_CARD_PLAY_PHASES.has(phase);
}

/**
 * The rendered card a local play replaces: the dragged card for drag plays, the hand card
 * for taps. Both are still mounted when the play callback fires.
 */
function getOriginObjectKind(isDragPlay: boolean): SceneObjectKind {
  return isDragPlay ? 'dragged-card' : 'hand-card';
}

/**
 * Read the world pose of the card being played, so its played card can launch from it.
 * Returns undefined when that card is not rendered (e.g. plays issued without the hand).
 */
export function capturePlayedCardOriginPose(
  scene: THREE.Object3D,
  cardId: string,
  isDragPlay: boolean
): PlayedCardOriginPose | undefined {
  const origin = scene.getObjectByName(sceneObjectName(getOriginObjectKind(isDragPlay), cardId));
  if (!origin?.visible) return undefined;

  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  origin.updateWorldMatrix(true, false);
  origin.matrixWorld.decompose(position, quaternion, scale);

  return {
    position: [position.x, position.y, position.z],
    quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
    scale: scale.x,
  };
}
