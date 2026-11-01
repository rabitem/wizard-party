'use client';

import { Suspense, type ComponentProps } from 'react';
import { Text } from '@react-three/drei';

type SceneTextProps = ComponentProps<typeof Text>;

/**
 * drei <Text> behind its own Suspense boundary. Text suspends until troika's fonts resolve,
 * and a suspension that reaches the Canvas root hides the whole scene: the default camera
 * takes over, the composer stops and every useFrame animation stalls. Here a pending font
 * only delays this label. Use it for every 3D text in the game scene.
 */
export function SceneText(props: SceneTextProps) {
  return (
    <Suspense fallback={null}>
      <Text {...props} />
    </Suspense>
  );
}

/**
 * Resolves troika's font preload while the scene is still loading. Every drei <Text> without
 * a `font` or `characters` prop shares one suspend cache entry, so once this hidden label has
 * resolved, text mounted later in the game (played-card badges, turn badges) never suspends.
 * Mount it outside <Physics> so the font loads in parallel with rapier.
 */
export function SceneTextFontWarmup() {
  return <SceneText visible={false}>{' '}</SceneText>;
}
