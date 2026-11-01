'use client';

import { Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { DEFAULT_APPEARANCE, type CharacterAppearance } from '@shared/domain/character';

import { CHARACTER_CLIPS, type CharacterClip } from '@/presentation/config/character.config';
import { PODIUM } from '@/presentation/config/podium.config';
import type { PodiumPlace, PodiumStand } from '@/presentation/types/podium.types';

import { CharacterFigure } from '../character';
import { figureSlots, STAGE_WIDTH, stepCenterX } from './podium-layout';

interface PodiumSceneProps {
  stands: readonly PodiumStand[];
  reduceMotion: boolean;
}

/** One object for the Canvas's lifetime: a new one per render would make R3F reconfigure. */
const CAMERA = { position: [...PODIUM.CAMERA_POSITION] as [number, number, number], near: PODIUM.CAMERA_NEAR, far: PODIUM.CAMERA_FAR };
const DPR: [number, number] = [1, PODIUM.MAX_DPR];

/** The champion cheers for CHEER_MS, rests, and cheers again; never with reduced motion. */
function useCheerPulse(enabled: boolean): boolean {
  const [cheering, setCheering] = useState(true);
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => setCheering((current) => !current), cheering ? PODIUM.CHEER_MS : PODIUM.CHEER_REST_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, cheering]);
  return enabled && cheering;
}

/**
 * Fits the stage's three steps to the canvas width (orthographic, so a step lines up with the
 * third of the width its names sit under) and looks slightly down at the podium.
 */
function StageCamera() {
  const getState = useThree((state) => state.get);
  const width = useThree((state) => state.size.width);
  useLayoutEffect(() => {
    const { camera } = getState();
    camera.zoom = width / STAGE_WIDTH;
    camera.lookAt(...PODIUM.CAMERA_TARGET);
    camera.updateProjectionMatrix();
  }, [getState, width]);
  return null;
}

function Step({ place }: { place: PodiumPlace }) {
  const height = PODIUM.STEP_HEIGHT[place];
  return (
    <mesh position={[0, height / 2, 0]}>
      <boxGeometry args={[PODIUM.STEP_WIDTH * PODIUM.STEP_FILL, height, PODIUM.STEP_DEPTH]} />
      <meshStandardMaterial color={PODIUM.STEP_COLOR[place]} roughness={PODIUM.STEP_ROUGHNESS} metalness={PODIUM.STEP_METALNESS} />
    </mesh>
  );
}

function StepFigures({ stand, cheering }: { stand: PodiumStand; cheering: boolean }) {
  const { offsets, scale } = figureSlots(stand.occupants.length);
  const clip = stand.place === 1 && cheering ? CHARACTER_CLIPS.CHEER : CHARACTER_CLIPS.IDLE;
  return (
    <>
      {stand.occupants.map((contender, index) => (
        <group key={contender.id} position={[offsets[index], PODIUM.STEP_HEIGHT[stand.place], 0]} scale={scale}>
          <Figure appearance={contender.appearance} clip={clip} />
        </group>
      ))}
    </>
  );
}

function Figure({ appearance, clip }: { appearance: CharacterAppearance | null; clip: CharacterClip }) {
  // A player whose look is unknown: the default look, all in one dark colour.
  return <CharacterFigure appearance={appearance ?? DEFAULT_APPEARANCE} silhouette={appearance === null} clip={clip} />;
}

/**
 * The podium in 3D: gold, silver and bronze steps with the players' figures on them. A small
 * transparent canvas, not interactive; R3F disposes the renderer and its context on unmount.
 */
export default function PodiumScene({ stands, reduceMotion }: PodiumSceneProps) {
  const cheering = useCheerPulse(!reduceMotion);
  return (
    <Canvas orthographic camera={CAMERA} dpr={DPR} className="pointer-events-none" style={{ position: 'absolute', inset: 0 }}>
      <StageCamera />
      <ambientLight intensity={PODIUM.AMBIENT_INTENSITY} />
      <directionalLight position={[...PODIUM.KEY_LIGHT_POSITION]} intensity={PODIUM.KEY_LIGHT_INTENSITY} />
      {stands.map((stand, index) => (
        <group key={stand.place} position={[stepCenterX(index, stands.length), 0, 0]}>
          <Step place={stand.place} />
          {/* One boundary per step: the steps show at once, figures when the model has loaded. */}
          <Suspense fallback={null}>
            <StepFigures stand={stand} cheering={cheering} />
          </Suspense>
        </group>
      ))}
    </Canvas>
  );
}
