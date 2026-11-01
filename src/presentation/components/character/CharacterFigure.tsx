'use client';

import { use, useEffect, useMemo, useRef, type ComponentProps } from 'react';
import { useAnimations } from '@react-three/drei';
import type { Group } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { CharacterAppearance } from '@shared/domain/character';

import { CHARACTER_CLIP_FADE_SECONDS, CHARACTER_CLIPS, type CharacterClip } from '@/presentation/config/character.config';
import { loadCharacterAnimations, loadCharacterModel } from './character-assets';
import { ownFigureMaterials } from './character-palette';
import { applyAppearance } from './character-parts';

interface CharacterFigureProps extends Omit<ComponentProps<'group'>, 'ref'> {
  appearance: CharacterAppearance;
  clip?: CharacterClip;
}

/**
 * One animated character: a clone of the shared rig showing the appearance's parts and palette,
 * playing `clip` and crossfading when it changes. Suspends while the assets load.
 */
export function CharacterFigure({ appearance, clip = CHARACTER_CLIPS.IDLE, ...groupProps }: CharacterFigureProps) {
  const model = use(loadCharacterModel());
  const motion = use(loadCharacterAnimations());
  // Each figure needs its own bones (SkeletonUtils.clone rebinds the skinned meshes to them) and
  // its own materials, so its palette leaves other figures alone.
  const figure = useMemo(() => {
    const copy = clone(model.scene);
    ownFigureMaterials(copy);
    return copy;
  }, [model.scene]);
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
  void loadCharacterModel().catch(() => undefined);
  void loadCharacterAnimations().catch(() => undefined);
}
