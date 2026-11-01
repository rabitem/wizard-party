import { AnimationAuditRecorder } from './animation-audit-recorder';
import type { ObjectSample, ReactCommitTotals, RenderSample, Vec3 } from './sandbox.types';

/* Builders for the AnimationAuditRecorder tests. Not part of the production barrel. */

export const FRAME = 1000 / 60;

export const REACT_ZERO: ReactCommitTotals = { domCommits: 0, r3fCommits: 0, r3fRenders: 0, r3fRendersPerCommitMax: 0 };

/** One scene object, named `kind:cardId` like the probe names them. */
export function sample(name: string, position: Vec3, overrides: Partial<ObjectSample> = {}): ObjectSample {
  const [kind, cardId] = name.split(':') as [ObjectSample['kind'], string];
  return { name, kind, cardId, position, cameraPosition: position, quaternion: [0, 0, 0, 1], scale: 1, visible: true, finite: true, ndc: null, ...overrides };
}

export function renderSample(overrides: Partial<RenderSample> = {}): RenderSample {
  return {
    drawCalls: 100,
    shadowDrawCalls: 10,
    triangles: 40000,
    textures: 30,
    geometries: 20,
    programs: 12,
    textureUploads: 0,
    uploadBytes: 0,
    programLinks: 0,
    cpuMs: 2,
    probeMs: 0.1,
    gpuMs: null,
    ...overrides,
  };
}

/** A recorder whose scene is ready at t=0, stepped one 60 Hz frame at a time. */
export function createRecorder() {
  const recorder = new AnimationAuditRecorder();
  recorder.start(0);
  recorder.markReady(0);
  let frame = 0;
  const step = (samples: ObjectSample[], handAnimating = false) => {
    frame++;
    recorder.frame(frame * FRAME, samples, { handAnimating });
  };
  return { recorder, step, now: () => frame * FRAME };
}

export const codes = (recorder: AnimationAuditRecorder) => recorder.anomalyList().map((anomaly) => anomaly.code);
