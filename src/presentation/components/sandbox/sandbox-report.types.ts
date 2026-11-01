import type { SandboxFormFactor } from '../../config/sandbox.config';
import type { SceneObjectKind } from '../three/scene-object-names';
import type { Anomaly, SandboxRunConfig, SandboxSettings, TimelineEntry, Vec3 } from './sandbox.types';

/** Frame-time distribution of a real-time run (clock=real), for performance budgets. */
export interface FrameTimingStats {
  frames: number;
  durationMs: number;
  fps: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  /** Share of frames over the 120 fps budget (8.33 ms) and the 60 fps budget (16.67 ms). */
  over120HzBudget: number;
  over60HzBudget: number;
}

export interface DistributionStats {
  samples: number;
  mean: number;
  p50: number;
  p95: number;
  max: number;
}

/** What the renderer did for one frame (all passes included). */
export interface RenderSample {
  drawCalls: number;
  /** Draw calls issued by shadow-map passes. */
  shadowDrawCalls: number;
  /** May be non-finite (instanced geometry without a bounded instance count); aggregation skips those frames. */
  triangles: number;
  textures: number;
  geometries: number;
  programs: number;
  /** texImage/texSubImage/compressedTexImage calls and their estimated bytes during this frame. */
  textureUploads: number;
  uploadBytes: number;
  /** linkProgram calls during this frame. */
  programLinks: number;
  /** Main-thread work of the frame (effects, useFrame, render submission) in real ms, probe excluded. */
  cpuMs: number | null;
  /** The probe's own cost this frame, real ms. */
  probeMs: number;
  /** GPU time of an earlier frame that resolved now (EXT_disjoint_timer_query_webgl2), when exposed. */
  gpuMs: number | null;
}

/** Render statistics over a span of frames (a whole run or a measurement window). */
export interface RenderWindowStats {
  frames: number;
  drawCallsMean: number;
  drawCallsMax: number;
  shadowDrawCallsMean: number;
  shadowDrawCallsMax: number;
  /** Mean over frames with a finite triangle count; null when none had one. */
  trianglesMean: number | null;
  nonFiniteTriangleFrames: number;
  textureUploads: number;
  uploadBytes: number;
  programLinks: number;
  cpuFrameMs: DistributionStats | null;
  gpuFrameMs: DistributionStats | null;
  /** Frame cost from the clock: display interval on the real clock, processing time on the virtual one. */
  frameCostMs: DistributionStats | null;
  probeMsMean: number;
}

/** Scene composition at one moment: what draws and what lights it. */
export interface SceneInventory {
  meshes: number;
  instancedMeshes: number;
  materials: number;
  /** Visible punctual lights (point, spot, directional). */
  lights: number;
  shadowCastingLights: number;
  points: number;
  texts: number;
}

export interface RenderMetrics extends RenderWindowStats {
  /** GPU resources once the scene was ready and at the end; growth during a run is a leak signal. */
  texturesAtReady: number;
  texturesAtEnd: number;
  geometriesAtReady: number;
  geometriesAtEnd: number;
  programsAtEnd: number;
  inventory: SceneInventory | null;
}

/**
 * React work, counted through the DevTools global hook. Null when the renderer was loaded before
 * the hook was installed (react-dom outside the Playwright fixture, which installs it at page start).
 */
export interface ReactCommitTotals {
  domCommits: number | null;
  r3fCommits: number | null;
  /** Components that rendered in R3F commits. */
  r3fRenders: number | null;
  r3fRendersPerCommitMax: number | null;
}

export interface WindowMetrics {
  label: string;
  virtualDurationMs: number;
  render: RenderWindowStats;
  react: ReactCommitTotals;
}

export interface RunMetrics {
  frames: number;
  virtualDurationMs: number;
  wallDurationMs: number;
  maxFrameCostMs: number;
  meanFrameCostMs: number;
  serverMessages: number;
  playedCardAnimations: number;
  collectedCards: number;
  render?: RenderMetrics;
  /** React work between ready and the end of the run. */
  react?: ReactCommitTotals;
  /** Named measurement windows (measure-start / measure-end steps). */
  windows: Record<string, WindowMetrics>;
  /** Only for real-time runs (clock=real). */
  frameTiming?: FrameTimingStats;
}

export interface RendererState {
  toneMapping: number;
  outputColorSpace: string;
  shadowMapEnabled: boolean;
  shadowMapType: number;
  pixelRatio: number;
}

/** What a snapshot saw, for diffing runs without comparing pixels. */
export interface SceneFacts {
  camera: { position: Vec3; fov: number | null };
  objects: Partial<Record<SceneObjectKind, number>>;
  renderer: RendererState;
  inventory: SceneInventory;
}

export interface SnapshotRecord {
  label: string;
  t: number;
  frame: number;
  held: boolean;
  settings: SandboxSettings;
  facts: SceneFacts | null;
  /** PNG data URL of the frame, when the step asked for it. */
  image?: string;
}

export interface WebGlEnvironment {
  webgl2: boolean;
  webgl1: boolean;
  renderer: string | null;
  vendor: string | null;
  /** SwiftShader, llvmpipe and friends: frame times on it say nothing about a player's GPU. */
  software: boolean;
  timerQuery: boolean;
}

export type SandboxProfileName = 'audit' | 'perf';

export interface RunEnvironment {
  userAgent: string;
  devicePixelRatio: number;
  touch: boolean;
  formFactor: SandboxFormFactor;
  profile: SandboxProfileName;
  probeStride: number;
  webgl: WebGlEnvironment;
}

export interface AuditReport {
  runId: string;
  scenario: string;
  config: SandboxRunConfig & { viewport: { width: number; height: number } };
  passed: boolean;
  anomalies: Anomaly[];
  metrics: RunMetrics;
  snapshots: SnapshotRecord[];
  environment: RunEnvironment;
  timeline: TimelineEntry[];
}
