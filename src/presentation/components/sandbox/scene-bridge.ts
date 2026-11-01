import type * as THREE from 'three';
import type { SceneObjectKind } from '../three/scene-object-names';

/** Live handles into the R3F scene, for agents and audits that need the scene or screen coordinates. */
export interface SandboxSceneBridge {
  readonly camera: THREE.Camera;
  readonly canvas: HTMLCanvasElement;
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
  findObject(kind: SceneObjectKind, cardId: string): THREE.Object3D | null;
  /** Client (CSS pixel) coordinates of a world position. */
  projectToClient(position: THREE.Vector3): { x: number; y: number };
  /** World-space centre of a card object, or null when it is not in the scene. */
  worldPositionOf(kind: SceneObjectKind, cardId: string): THREE.Vector3 | null;
  /** Assets three.js loaders are still fetching (textures, environment maps). */
  readonly pendingLoads: number;
  /**
   * PNG data URL of the next rendered frame, read right after it rendered (so the canvas needs no
   * preserveDrawingBuffer). Resolves null when the canvas cannot be read.
   */
  captureFrame(): Promise<string | null>;
  /** Asks the demand frame loop for a frame (the scene may be idle and draw none by itself). */
  requestFrame(): void;
}

let activeBridge: SandboxSceneBridge | null = null;

export function getSandboxSceneBridge(): SandboxSceneBridge | null {
  return activeBridge;
}

/** Publishes the bridge of the mounted probe; returns the unpublish function. */
export function publishSandboxSceneBridge(bridge: SandboxSceneBridge): () => void {
  activeBridge = bridge;
  return () => {
    if (activeBridge === bridge) activeBridge = null;
  };
}
