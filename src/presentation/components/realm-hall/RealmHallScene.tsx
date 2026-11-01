'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { REALM_HALL, hallStopsFor } from '@/presentation/config/realm-hall.config';
import { TableSurface } from '../table';
import { useSelectedTableTheme } from '../table/table-theme';
import { useRenderQuality } from '../three/render-quality';
import { ShaderWarmup } from '../three/shader-warmup';
import { ThemedEnvironment } from '../three/themed-environments';
import { SceneLighting } from '../three/SceneLighting';
import { AMBIENT_USER_DATA } from '../three/frame-scheduling/ambient';
import { selectHtmlOverlayTargetReady } from '../three/html-overlay-target';
import { cameraPoseAt } from './hall-path';
import { hallProgressStore } from './hall-progress-store';
import { HallLoadingReporter } from './HallLoadingReporter';

const NO_PLAYERS: never[] = [];

/**
 * Walks the camera to the page's scroll position. Progress comes from hallProgressStore; the
 * camera eases toward it and asks for frames only while it is still moving (frameloop "demand").
 * With reduced motion the camera stays at the first stop.
 */
function CameraRig({ still }: { still: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  const aspect = useThree((state) => state.size.width / Math.max(state.size.height, 1));
  const stops = useMemo(() => hallStopsFor(aspect), [aspect]);
  const eased = useRef(hallProgressStore.get());
  const lookAt = useMemo(() => new Vector3(), []);

  useEffect(() => (still ? undefined : hallProgressStore.subscribe(() => invalidate())), [still, invalidate]);
  useEffect(() => invalidate(), [stops, invalidate]);

  useFrame(({ camera }, delta) => {
    const target = still ? 0 : hallProgressStore.get();
    const step = 1 - Math.exp(-REALM_HALL.CAMERA_EASE * Math.min(delta, 0.1));
    eased.current += (target - eased.current) * step;
    if (Math.abs(target - eased.current) < 0.0005) eased.current = target;
    else invalidate();
    const pose = cameraPoseAt(stops, eased.current);
    camera.position.set(...pose.position);
    camera.lookAt(lookAt.set(...pose.target));
  });
  return null;
}

/**
 * True a couple of frames after the canvas's events connect. The rooms carry drei `<Html>`
 * overlays (the casino banner) that re-root, and lose their text, when they mount while the
 * canvas is still settling its DOM target; the game mounts its room later too (behind physics
 * loading). See html-overlay-target.ts.
 */
function useCanvasSettled(): boolean {
  const connected = useThree(selectHtmlOverlayTargetReady);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!connected) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setSettled(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [connected]);
  return settled;
}

/**
 * The active realm's game room and table, exactly as the game draws them (ThemedEnvironment,
 * SceneLighting, TableSurface), without players, cards or physics.
 */
export function RealmHallScene({ still }: { still: boolean }) {
  const tableTheme = useSelectedTableTheme();
  const { structuralTier } = useRenderQuality();
  const settled = useCanvasSettled();
  return (
    <>
      <CameraRig still={still} />
      <HallLoadingReporter settled={settled} />
      {/* Compiles the room's shaders before the walk reaches them and draws the first shadow map */}
      <ShaderWarmup warmupKey={`${tableTheme.id}:${structuralTier}`} />
      {/* Room decor animates at the scheduler's ambient rate, as in the game */}
      <group userData={AMBIENT_USER_DATA}>
        {settled ? <ThemedEnvironment /> : null}
      </group>
      <SceneLighting />
      {/* The game lights the table for play; seen from across the room the walls need a little fill */}
      <hemisphereLight args={[REALM_HALL.FILL.SKY, REALM_HALL.FILL.GROUND, REALM_HALL.FILL.INTENSITY]} />
      <TableSurface players={NO_PLAYERS} localPlayerId="" currentPlayerIndex={-1} />
    </>
  );
}
