'use client';

import { use, useEffect, useMemo, useRef, type ComponentProps } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations } from '@react-three/drei';
import { LoopOnce, MeshStandardMaterial, type AnimationAction, type Event, type Group, type Mesh, type Object3D } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { CharacterAppearance } from '@shared/domain/character';

import { CHARACTER_CLIP_FADE_SECONDS, CHARACTER_CLIPS, CHARACTER_SILHOUETTE_COLOR, type CharacterClip } from '@/presentation/config/character.config';
import { loadCharacterAnimations, loadCharacterModel } from './character-assets';
import { ownFigureMaterials } from './character-palette';
import { bakeFigure } from './character-bake';
import { applyAppearance } from './character-parts';
import { prepareSkeletons, type PoseGate } from './character-skeleton';

/** A clip played once on top of the resting clip; a new `key` plays it again. */
export interface CharacterOneShot {
  clip: CharacterClip;
  key: number;
}

interface CharacterFigureProps extends Omit<ComponentProps<'group'>, 'ref'> {
  appearance: CharacterAppearance;
  /** The resting clip: looped, or held on its first frame with `holdPose`. */
  clip?: CharacterClip;
  /**
   * Holds the resting clip's first frame instead of playing it, and stops uploading the pose once
   * it is in place: a figure at rest costs nothing per frame.
   */
  holdPose?: boolean;
  /** Played once, then the figure settles back into its resting clip. */
  oneShot?: CharacterOneShot;
  /** One flat dark colour instead of the palette: a look nobody may see. */
  silhouette?: boolean;
}

/** Shared by every silhouette; never disposed. */
let silhouetteMaterial: MeshStandardMaterial | null = null;

function silhouetteOf(figure: Object3D): void {
  silhouetteMaterial ??= new MeshStandardMaterial({ color: CHARACTER_SILHOUETTE_COLOR, roughness: 1, metalness: 0 });
  figure.traverse((object) => {
    if ((object as Mesh).isMesh) (object as Mesh).material = silhouetteMaterial as MeshStandardMaterial;
  });
}

/** Mixer seconds after which a held pose is final: the fade, plus a frame to draw it. */
const HOLD_AFTER_SECONDS = CHARACTER_CLIP_FADE_SECONDS + 0.1;

function startRest(rest: AnimationAction, holdPose: boolean): void {
  // A held pose never advances: a time scale of 0 keeps the clip on its first frame.
  rest.reset().setEffectiveTimeScale(holdPose ? 0 : 1).fadeIn(CHARACTER_CLIP_FADE_SECONDS).play();
}

/**
 * Closes a held pose's bone uploads once the mixer's own clock has passed the fade, so timing
 * follows the scene's clock (virtual in the sandbox), never wall time.
 */
function useHoldWhenSettled(gate: PoseGate, mixerTime: () => number) {
  const holdAt = useRef<number | null>(null);
  useFrame(() => {
    if (holdAt.current !== null && mixerTime() >= holdAt.current) {
      holdAt.current = null;
      gate.hold();
    }
  });
  return {
    schedule: () => {
      holdAt.current = mixerTime() + HOLD_AFTER_SECONDS;
    },
    cancel: () => {
      holdAt.current = null;
      gate.release();
    },
  };
}

/**
 * One animated character: a clone of the shared rig showing the appearance's parts and palette,
 * playing `clip` and crossfading when it changes. Suspends while the assets load.
 */
export function CharacterFigure({ appearance, clip = CHARACTER_CLIPS.IDLE, holdPose = false, oneShot, silhouette = false, ...groupProps }: CharacterFigureProps) {
  const model = use(loadCharacterModel());
  const motion = use(loadCharacterAnimations());
  // Each figure needs its own bones (SkeletonUtils.clone rebinds the skinned meshes to them) and
  // its own materials, so its palette leaves other figures alone.
  const { figure, materials, gate } = useMemo(() => {
    const copy = clone(model.scene);
    const poseGate = prepareSkeletons(copy);
    if (silhouette) {
      silhouetteOf(copy);
      return { figure: copy, materials: [], gate: poseGate };
    }
    return { figure: copy, materials: ownFigureMaterials(copy), gate: poseGate };
  }, [model.scene, silhouette]);
  const root = useRef<Group>(null);
  const { actions, mixer } = useAnimations(motion.animations, root);
  const settle = useHoldWhenSettled(gate, () => mixer.time);

  useEffect(() => () => {
    materials.forEach((material) => material.dispose());
    gate.dispose();
  }, [materials, gate]);
  // The chosen parts, merged into a draw call or two per material (character-bake.ts).
  useEffect(() => {
    applyAppearance(figure, appearance);
    const bake = bakeFigure(figure);
    return () => bake.dispose();
  }, [figure, appearance]);

  useEffect(() => {
    const rest = actions[clip];
    if (!rest) return undefined;
    settle.cancel();
    startRest(rest, holdPose);
    if (holdPose) settle.schedule();
    return () => {
      rest.setEffectiveTimeScale(1).fadeOut(CHARACTER_CLIP_FADE_SECONDS);
    };
    // `settle` is stable in what it touches (refs and the gate); the rest clip restarts only when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, clip, holdPose]);

  const oneShotKey = oneShot?.key;
  const oneShotClip = oneShot?.clip;
  useEffect(() => {
    const action = oneShotClip ? actions[oneShotClip] : undefined;
    const rest = actions[clip];
    if (!action || !rest) return undefined;
    settle.cancel();
    rest.fadeOut(CHARACTER_CLIP_FADE_SECONDS);
    action.reset().setLoop(LoopOnce, 1).setEffectiveTimeScale(1).fadeIn(CHARACTER_CLIP_FADE_SECONDS).play();
    const onFinished = (event: Event & { action?: AnimationAction }) => {
      if (event.action !== action) return;
      action.fadeOut(CHARACTER_CLIP_FADE_SECONDS);
      startRest(rest, holdPose);
      if (holdPose) settle.schedule();
    };
    mixer.addEventListener('finished', onFinished);
    return () => mixer.removeEventListener('finished', onFinished);
    // Plays once per key; the rest clip and hold it returns to are read when it finishes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, mixer, oneShotKey]);

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
