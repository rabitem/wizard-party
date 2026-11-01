'use client';

import { useEffect, useMemo, useRef } from 'react';
import { addAfterEffect, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneObjectKind } from '../three/scene-object-names';
import { LoadingTracker } from './loading-tracker';
import { publishSandboxSceneBridge, type SandboxSceneBridge } from './scene-bridge';
import { sampleSceneObjects } from './scene-sampler';
import { useRenderInstrumentation } from './useRenderInstrumentation';
import type { ObjectSample, RenderSample, Vec3 } from './sandbox.types';

interface SceneAnimationProbeProps {
  /** `samples` is null on frames the profile skips (perf mode samples every Nth frame). */
  onFrame: (samples: ObjectSample[] | null, camera: Vec3, render: RenderSample) => void;
  /** The scene is going away (game end, disconnect overlay, run teardown); its objects did not just vanish. */
  onSceneUnmount: () => void;
  /** Real (wall) time, for measuring frame and probe cost under the virtual clock. */
  realNow: () => number;
  /** Card transforms are sampled every `sampleStride` frames. */
  sampleStride: number;
}

type CaptureRequest = (dataUrl: string | null) => void;

function readCanvas(canvas: HTMLCanvasElement): string | null {
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/**
 * Samples every named card object once per drawn frame and publishes the scene bridge.
 * Sampling runs as an R3F after-effect, after every useFrame subscriber has updated and the
 * frame was rendered, so sample N is exactly what frame N showed (camera-relative children
 * included). Scene and camera are read from the store each time, never from a stale closure.
 */
export function SceneAnimationProbe({ onFrame, onSceneUnmount, realNow, sampleStride }: SceneAnimationProbeProps) {
  const get = useThree((state) => state.get);
  const captures = useRef<CaptureRequest[]>([]);
  const loading = useRef<LoadingTracker | null>(null);
  const instrumentation = useRenderInstrumentation(get, realNow);

  const bridge = useMemo<SandboxSceneBridge>(() => {
    const find = (kind: SceneObjectKind, cardId: string) => get().scene.getObjectByName(`${kind}:${cardId}`) ?? null;
    return {
      get camera() {
        return get().camera;
      },
      get canvas() {
        return get().gl.domElement;
      },
      get scene() {
        return get().scene;
      },
      get renderer() {
        return get().gl;
      },
      findObject: find,
      projectToClient(position) {
        const { camera, gl } = get();
        const ndc = position.clone().project(camera);
        const rect = gl.domElement.getBoundingClientRect();
        return {
          x: rect.left + ((ndc.x + 1) / 2) * rect.width,
          y: rect.top + ((1 - ndc.y) / 2) * rect.height,
        };
      },
      worldPositionOf(kind, cardId) {
        const object = find(kind, cardId);
        return object ? object.getWorldPosition(new THREE.Vector3()) : null;
      },
      get pendingLoads() {
        return loading.current?.pendingLoads ?? 0;
      },
      requestFrame() {
        get().invalidate();
      },
      captureFrame() {
        return new Promise<string | null>((resolve) => {
          captures.current.push(resolve);
        });
      },
    };
  }, [get]);

  useEffect(() => publishSandboxSceneBridge(bridge), [bridge]);

  useEffect(() => {
    const tracker = new LoadingTracker();
    loading.current = tracker;
    return () => {
      tracker.dispose();
      if (loading.current === tracker) loading.current = null;
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    return addAfterEffect(() => {
      const probeStartedAt = realNow();
      const { scene, camera, gl } = get();
      // The drawing buffer still holds this frame inside the callback that rendered it.
      for (const resolve of captures.current.splice(0)) resolve(readCanvas(gl.domElement));
      const render = instrumentation.takeSample(probeStartedAt);
      // On a lost context three.js draws nothing and skips the world-matrix update: nobody saw
      // this frame, and its transforms are half updated. The next drawn frame is sampled.
      const drawn = !gl.getContext().isContextLost();
      const samples = drawn && frame++ % sampleStride === 0 ? sampleSceneObjects(scene, camera) : null;
      render.probeMs = Math.max(0, realNow() - probeStartedAt);
      onFrame(samples, [camera.position.x, camera.position.y, camera.position.z], render);
    });
  }, [get, onFrame, realNow, sampleStride, instrumentation]);

  useEffect(() => {
    const pending = captures.current;
    return () => {
      for (const resolve of pending.splice(0)) resolve(null);
    };
  }, []);

  useEffect(() => onSceneUnmount, [onSceneUnmount]);

  return null;
}
