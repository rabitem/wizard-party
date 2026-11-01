import { describe, expect, it } from 'vitest';
import { AnimationAuditRecorder, type EndState } from './animation-audit-recorder';
import { REACT_ZERO, renderSample } from './animation-audit-recorder.fixtures';
import type { ReactCommitTotals } from './sandbox.types';

const SETTLED: EndState = { trickResult: false, pendingTrickResult: false, isTrickAnimating: false, handAnimation: 'none', localHandSize: null, phase: null };

function readyRecorder(react: ReactCommitTotals = REACT_ZERO): AnimationAuditRecorder {
  const recorder = new AnimationAuditRecorder();
  recorder.start(0);
  recorder.markReady(0, { react });
  return recorder;
}

describe('AnimationAuditRecorder', () => {
  describe('render metrics', () => {
    it('should average draw calls and keep their peak', () => {
      const recorder = readyRecorder();
      recorder.renderSample(renderSample({ drawCalls: 100, shadowDrawCalls: 4 }));
      recorder.renderSample(renderSample({ drawCalls: 200, shadowDrawCalls: 8 }));
      expect(recorder.metrics().render).toMatchObject({ frames: 2, drawCallsMean: 150, drawCallsMax: 200, shadowDrawCallsMax: 8 });
    });

    it('should skip non-finite triangle counts instead of turning the mean into null', () => {
      const recorder = readyRecorder();
      recorder.renderSample(renderSample({ triangles: 1000 }));
      recorder.renderSample(renderSample({ triangles: Number.POSITIVE_INFINITY }));
      recorder.renderSample(renderSample({ triangles: 3000 }));
      expect(recorder.metrics().render).toMatchObject({ trianglesMean: 2000, nonFiniteTriangleFrames: 1 });
    });

    it('should report a null triangle mean when no frame had a finite count', () => {
      const recorder = readyRecorder();
      recorder.renderSample(renderSample({ triangles: Number.NaN }));
      expect(recorder.metrics().render?.trianglesMean).toBeNull();
    });

    it('should total uploads and links and summarise CPU and frame cost', () => {
      const recorder = readyRecorder();
      recorder.renderSample(renderSample({ textureUploads: 2, uploadBytes: 1024, programLinks: 1, cpuMs: 4 }));
      recorder.renderSample(renderSample({ textureUploads: 1, uploadBytes: 512, cpuMs: null }));
      recorder.frameCost(16);
      recorder.frameCost(Number.NaN);
      const render = recorder.metrics().render;
      expect(render).toMatchObject({ textureUploads: 3, uploadBytes: 1536, programLinks: 1, gpuFrameMs: null });
      expect(render?.cpuFrameMs?.samples).toBe(1);
      expect(render?.frameCostMs?.samples).toBe(1);
    });

    it('should report percentiles of the frame cost', () => {
      const recorder = readyRecorder();
      recorder.renderSample(renderSample());
      for (let cost = 1; cost <= 100; cost++) recorder.frameCost(cost);
      expect(recorder.metrics().render?.frameCostMs).toMatchObject({ samples: 100, p50: 51, p95: 96, max: 100 });
    });

    it('should exclude loading frames and report resources at ready and at the end', () => {
      const recorder = new AnimationAuditRecorder();
      recorder.start(0);
      recorder.renderSample(renderSample({ textures: 5, programLinks: 20 }));
      recorder.markReady(0);
      recorder.renderSample(renderSample({ textures: 30 }));
      recorder.renderSample(renderSample({ textures: 34 }));
      expect(recorder.metrics().render).toMatchObject({ frames: 2, programLinks: 0, texturesAtReady: 5, texturesAtEnd: 34 });
    });
  });

  describe('react work', () => {
    it('should count the React work between ready and the end, keeping the end maximum', () => {
      const recorder = readyRecorder({ domCommits: 10, r3fCommits: 4, r3fRenders: 400, r3fRendersPerCommitMax: 90 });
      recorder.finish(1000, SETTLED, { domCommits: 15, r3fCommits: 6, r3fRenders: 500, r3fRendersPerCommitMax: 50 });
      expect(recorder.metrics().react).toEqual({ domCommits: 5, r3fCommits: 2, r3fRenders: 100, r3fRendersPerCommitMax: 50 });
    });

    it('should stay null for renderers the hook never saw', () => {
      const unseen: ReactCommitTotals = { domCommits: null, r3fCommits: 3, r3fRenders: null, r3fRendersPerCommitMax: null };
      const recorder = readyRecorder(unseen);
      recorder.finish(1000, SETTLED, unseen);
      expect(recorder.metrics().react).toMatchObject({ domCommits: null, r3fCommits: 0 });
    });
  });

  describe('measurement windows and snapshots', () => {
    it('should report the render samples of each window and the snapshots in run time', () => {
      const recorder = new AnimationAuditRecorder();
      recorder.start(0);
      recorder.markReady(1000);
      recorder.startWindow(1000, 'idle', REACT_ZERO);
      recorder.renderSample(renderSample({ drawCalls: 80 }));
      recorder.endWindow(2000, 'idle', { ...REACT_ZERO, r3fCommits: 1 });
      recorder.addSnapshot({ label: 'room-default', t: 1500, frame: 3, held: false, settings: { cardTheme: 'fantasy', tableTheme: 'default', theme: 'dark', collectionAnimation: 'random', cardNumberSize: 'medium' }, facts: null });

      const { windows } = recorder.metrics();
      expect(windows.idle.render.drawCallsMean).toBe(80);
      expect(windows.idle.react.r3fCommits).toBe(1);
      expect(recorder.snapshotList()[0].t).toBe(500);
    });

    it('should collect only the frames drawn while a window is open', () => {
      const recorder = readyRecorder();
      recorder.renderSample(renderSample({ drawCalls: 999 }));
      recorder.startWindow(1000, 'idle', REACT_ZERO);
      recorder.renderSample(renderSample({ drawCalls: 50 }));
      recorder.renderSample(renderSample({ drawCalls: 70 }));
      expect(recorder.endWindow(3000, 'idle', { ...REACT_ZERO, r3fCommits: 2 })).toBe(true);
      recorder.renderSample(renderSample({ drawCalls: 999 }));

      const idle = recorder.metrics().windows.idle;
      expect(idle.virtualDurationMs).toBe(2000);
      expect(idle.render).toMatchObject({ frames: 2, drawCallsMax: 70 });
      expect(idle.react.r3fCommits).toBe(2);
    });

    it('should refuse to end a window that is not open and close open ones at the finish', () => {
      const recorder = readyRecorder();
      expect(recorder.endWindow(0, 'missing', REACT_ZERO)).toBe(false);
      recorder.startWindow(0, 'round', REACT_ZERO);
      recorder.finish(500, SETTLED, REACT_ZERO);
      expect(recorder.metrics().windows.round.virtualDurationMs).toBe(500);
    });
  });
});
