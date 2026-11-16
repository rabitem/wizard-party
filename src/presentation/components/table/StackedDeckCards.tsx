'use client';

import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { CARD_PHYSICS, interactionGroups } from '@/presentation/config/rapier.config';
import { CARD_TEXTURE_QUALITY } from '@/presentation/config/card-render.config';
import { CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS, getCurrentCardBackTexture, getSharedCardBackMaterial } from '@/presentation/utils/card-texture';
import { useCardThemeVersion } from '@/presentation/hooks/useCardTheme';
import { sceneObjectName, getRigidBodyPoseKey } from '../three';
import { createStackedDeckMesh, type DeckCardPlacement } from './stacked-deck-mesh';

function CollectedCardCollider({ card, layout }: DeckCardPlacement) {
  const userData = useMemo(() => ({ cardId: card.id }), [card.id]);
  return <RigidBody key={getRigidBodyPoseKey('fixed', layout.position, layout.rotation)} type="fixed" name={sceneObjectName('deck-card', card.id)}
    position={layout.position} rotation={layout.rotation} scale={layout.scale} userData={userData} colliders={false}
    collisionGroups={interactionGroups(CARD_PHYSICS.COLLISION_MEMBERSHIP, CARD_PHYSICS.COLLISION_FILTER)}>
    <CuboidCollider args={[CARD_WIDTH / 2, CARD_HEIGHT / 2, CARD_THICKNESS / 2]} friction={CARD_PHYSICS.FRICTION} restitution={CARD_PHYSICS.RESTITUTION} />
  </RigidBody>;
}

/** The same six visible faces and fixed colliders, in two draw calls for the whole pile. */
export function StackedDeckCards({ cards }: { cards: readonly DeckCardPlacement[] }) {
  const themeVersion = useCardThemeVersion();
  const gl = useThree(state => state.gl);
  const invalidate = useThree(state => state.invalidate);
  const resources = useMemo(() => createStackedDeckMesh(cards), [cards, themeVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const back = useMemo(() => getSharedCardBackMaterial(getCurrentCardBackTexture(), 'table'), [themeVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    resources.paint(themeVersion, Math.min(gl.capabilities.getMaxAnisotropy(), CARD_TEXTURE_QUALITY.MAX_ANISOTROPY));
    invalidate();
  }, [resources, themeVersion, gl, invalidate]);
  useEffect(() => () => resources.dispose(), [resources]);
  return <>
    <mesh geometry={resources.back} material={back} castShadow receiveShadow />
    <mesh geometry={resources.front} material={resources.material} castShadow receiveShadow />
    {cards.map(placement => <CollectedCardCollider key={placement.card.id} {...placement} />)}
  </>;
}
