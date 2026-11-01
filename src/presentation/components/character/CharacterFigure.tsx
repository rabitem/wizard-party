'use client';

import { useEffect, useMemo, useRef, type ComponentProps } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import type { Group } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { CharacterAppearance } from '@shared/domain/character';

import { CHARACTER_ASSETS, CHARACTER_CLIP_FADE_SECONDS, CHARACTER_CLIPS, type CharacterClip } from '@/presentation/config/character.config';
import { applyAppearance } from './character-parts';

/** Both files are meshopt-compressed (third argument). */
const USE_DRACO = false;
const USE_MESHOPT = true;

interface CharacterFigureProps extends Omit<ComponentProps<'group'>, 'ref'> {
  appearance: CharacterAppearance;
  clip?: CharacterClip;
}

/**
 * One animated character: a clone of the shared rig showing the appearance's parts, playing
 * `clip` and crossfading when it changes. Suspends while the assets load.
 */
export function CharacterFigure({ appearance, clip = CHARACTER_CLIPS.IDLE, ...groupProps }: CharacterFigureProps) {
  const model = useGLTF(CHARACTER_ASSETS.MODEL_URL, USE_DRACO, USE_MESHOPT);
  const motion = useGLTF(CHARACTER_ASSETS.ANIMATIONS_URL, USE_DRACO, USE_MESHOPT);
  // Each figure needs its own bones; SkeletonUtils.clone rebinds the skinned meshes to them.
  const figure = useMemo(() => clone(model.scene), [model.scene]);
  const root = useRef<Group>(null);
  const { actions } = useAnimations(motion.animations, root);

  useEffect(() => applyAppearance(figure, appearance), [figure, appearance]);

  useEffect(() => {
    const action = actions[clip];
    action?.reset().fadeIn(CHARACTER_CLIP_FADE_SECONDS).play();
    return () => {
      action?.fadeOut(CHARACTER_CLIP_FADE_SECONDS);
    };
  }, [actions, clip]);

  return (
    <group ref={root} {...groupProps}>
      <primitive object={figure} />
    </group>
  );
}

/** Starts downloading the character files before the first figure mounts. */
export function preloadCharacterAssets(): void {
  useGLTF.preload(CHARACTER_ASSETS.MODEL_URL, USE_DRACO, USE_MESHOPT);
  useGLTF.preload(CHARACTER_ASSETS.ANIMATIONS_URL, USE_DRACO, USE_MESHOPT);
}
