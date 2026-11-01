import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GamePhase } from '@shared/domain';
import { capturePlayedCardOriginPose, shouldKeepPendingCardPlay } from './pending-card-play';
import { sceneObjectName } from './scene-object-names';

function createSceneWithCards() {
  const scene = new THREE.Scene();
  const hand = new THREE.Group();
  hand.position.set(0, 3, 5);
  hand.scale.setScalar(0.5);
  scene.add(hand);

  const handCard = new THREE.Group();
  handCard.name = sceneObjectName('hand-card', 'ELVES-8');
  handCard.position.set(-0.4, 0.2, 0);
  handCard.scale.setScalar(1.2);
  hand.add(handCard);

  const draggedCard = new THREE.Group();
  draggedCard.name = sceneObjectName('dragged-card', 'ELVES-8');
  draggedCard.position.set(0.5, 0.35, 2.2);
  draggedCard.rotation.set(-Math.PI / 2, 0, 0.1);
  draggedCard.scale.setScalar(0.78);
  scene.add(draggedCard);

  return { scene, handCard, draggedCard };
}

describe('shouldKeepPendingCardPlay', () => {
  it.each([GamePhase.PLAYING, GamePhase.ROUND_END, GamePhase.GAME_END])(
    'keeps the last play while it can still be on the table (%s)',
    (phase) => {
      expect(shouldKeepPendingCardPlay(phase)).toBe(true);
    }
  );

  it.each([GamePhase.LOBBY, GamePhase.DEALING, GamePhase.TRUMP_SELECTION, GamePhase.BIDDING])(
    'forgets the last play once a new deal starts (%s)',
    (phase) => {
      expect(shouldKeepPendingCardPlay(phase)).toBe(false);
    }
  );
});

describe('capturePlayedCardOriginPose', () => {
  it('reads the world pose of the hand card for a tap play', () => {
    const { scene } = createSceneWithCards();
    const pose = capturePlayedCardOriginPose(scene, 'ELVES-8', false);

    expect(pose?.position[0]).toBeCloseTo(-0.2);
    expect(pose?.position[1]).toBeCloseTo(3.1);
    expect(pose?.position[2]).toBeCloseTo(5);
    expect(pose?.scale).toBeCloseTo(0.6);
  });

  it('reads the dragged card for a drag play', () => {
    const { scene, draggedCard } = createSceneWithCards();
    const pose = capturePlayedCardOriginPose(scene, 'ELVES-8', true);
    const expectedQuaternion = draggedCard.quaternion;

    expect(pose?.position[0]).toBeCloseTo(0.5);
    expect(pose?.position[1]).toBeCloseTo(0.35);
    expect(pose?.position[2]).toBeCloseTo(2.2);
    expect(pose?.scale).toBeCloseTo(0.78);
    expect(new THREE.Quaternion().fromArray(pose?.quaternion ?? []).angleTo(expectedQuaternion)).toBeCloseTo(0);
  });

  it('does not fall back to the hidden hand card when the dragged card is gone', () => {
    const { scene, draggedCard, handCard } = createSceneWithCards();
    draggedCard.removeFromParent();
    handCard.visible = false;

    expect(capturePlayedCardOriginPose(scene, 'ELVES-8', true)).toBeUndefined();
    expect(capturePlayedCardOriginPose(scene, 'ELVES-8', false)).toBeUndefined();
  });

  it('returns nothing for cards that are not rendered', () => {
    const { scene } = createSceneWithCards();
    expect(capturePlayedCardOriginPose(scene, 'GIANTS-11', false)).toBeUndefined();
  });
});
