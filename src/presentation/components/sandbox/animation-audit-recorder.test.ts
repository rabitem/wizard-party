import { describe, expect, it } from 'vitest';
import { AnimationAuditRecorder } from './animation-audit-recorder';
import { FRAME, codes, createRecorder, sample } from './animation-audit-recorder.fixtures';

describe('AnimationAuditRecorder', () => {
  describe('motion', () => {
    it('should accept smooth card motion', () => {
      const { recorder, step } = createRecorder();
      for (let index = 0; index < 30; index++) step([sample('played-card:A', [index * 0.05, 0.3, 0])]);
      expect(codes(recorder)).toEqual([]);
    });

    it('should not call a smoothly accelerating long throw a teleport', () => {
      const { recorder, step } = createRecorder();
      for (let index = 0; index < 12; index++) {
        const y = 6.5 - 0.01 * index * index - 0.25 * index;
        step([sample('played-card:A', [0, y, 6 - 0.3 * index])]);
      }
      expect(codes(recorder)).not.toContain('teleport');
    });

    it('should flag a card that jumps across the table in one frame', () => {
      const { recorder, step } = createRecorder();
      step([sample('played-card:A', [0, 0.3, 0])]);
      step([sample('played-card:A', [2, 0.3, 0])]);
      expect(codes(recorder)).toContain('teleport');
    });

    it('should judge hand cards in camera space so camera motion is not a teleport', () => {
      const { recorder, step } = createRecorder();
      step([sample('hand-card:A', [0, 0.2, 2.6], { cameraPosition: [0, -0.5, -1] })]);
      step([sample('hand-card:A', [0, 3.3, 5], { cameraPosition: [0, -0.5, -1] })]);
      expect(codes(recorder)).not.toContain('teleport');
    });

    it('should judge hand cards on screen: gliding back toward the camera is not a jump', () => {
      const { recorder, step } = createRecorder();
      const ndc = (cx: number, size: number) => ({ minX: cx - size / 2, maxX: cx + size / 2, minY: -0.9, maxY: -0.9 + size });
      step([sample('hand-card:A', [0, 1, 2.3], { cameraPosition: [-0.4, -0.7, -6], ndc: ndc(-0.07, 0.1) })]);
      step([sample('hand-card:A', [0, 1.4, 2.8], { cameraPosition: [-0.4, -0.7, -5.4], ndc: ndc(-0.08, 0.12) })]);
      expect(codes(recorder)).not.toContain('teleport');

      step([sample('hand-card:A', [0, 1.4, 2.8], { cameraPosition: [-0.4, -0.7, -5.4], ndc: ndc(0.5, 0.12) })]);
      expect(codes(recorder)).toContain('teleport');
    });

    it('should flag non-finite transforms and cards below the felt', () => {
      const { recorder, step } = createRecorder();
      step([sample('played-card:A', [0, 0.3, 0])]);
      step([sample('played-card:A', [0, -0.2, 0])]);
      step([sample('collecting-card:B', [Number.NaN, 0.3, 0], { finite: false })]);
      expect(codes(recorder)).toEqual(expect.arrayContaining(['below-table', 'non-finite-transform']));
    });
  });

  describe('continuity', () => {
    it('should flag a scripted card snapping out of a hover', () => {
      const { recorder, step } = createRecorder();
      for (let index = 0; index < 5; index++) step([sample('collecting-card:A', [0, 0.3, 0])]);
      step([sample('collecting-card:A', [0.18, 0.3, 0])]);
      expect(codes(recorder)).toContain('path-kink');
      expect(codes(recorder)).not.toContain('teleport');
    });

    it('should accept a tight orbit at constant curvature', () => {
      const { recorder, step } = createRecorder();
      // 0.3 rad per frame, like a spiral collection orbit: acceleration ~0.18 units/frame², steady.
      for (let index = 0; index < 30; index++) {
        const angle = index * 0.3;
        step([sample('collecting-card:A', [2 * Math.cos(angle), 0.3, 2 * Math.sin(angle)])]);
      }
      expect(codes(recorder)).not.toContain('path-kink');
    });

    it('should accept a fast but smooth arc', () => {
      const { recorder, step } = createRecorder();
      for (let index = 0; index < 30; index++) {
        const angle = index * 0.15;
        step([sample('collecting-card:A', [Math.cos(angle), 0.3, Math.sin(angle)])]);
      }
      expect(codes(recorder)).not.toContain('path-kink');
    });

    it('should flag a sudden rotation snap', () => {
      const { recorder, step } = createRecorder();
      const yaw = (radians: number): [number, number, number, number] => [0, Math.sin(radians / 2), 0, Math.cos(radians / 2)];
      for (let index = 0; index < 4; index++) step([sample('played-card:A', [0, 0.3, 0], { quaternion: yaw(0) })]);
      step([sample('played-card:A', [0, 0.3, 0], { quaternion: yaw(0.6) })]);
      expect(codes(recorder)).toContain('rotation-pop');
    });

    it('should ignore loading frames before the scene is ready', () => {
      const recorder = new AnimationAuditRecorder();
      recorder.start(0);
      recorder.frame(FRAME, [sample('played-card:A', [0, 0.3, 0])], { handAnimating: false });
      recorder.frame(2 * FRAME, [sample('played-card:A', [3, 0.3, 0])], { handAnimating: false });
      expect(codes(recorder)).not.toContain('teleport');
    });
  });

  describe('handoffs', () => {
    it('should accept a played -> collecting handoff on the same frame at the same spot', () => {
      const { recorder, step, now } = createRecorder();
      step([sample('played-card:A', [1, 0.05, 0])]);
      recorder.playedAnimationComplete(now(), 'A');
      recorder.allCardsLanded(now());
      step([sample('collecting-card:A', [1, 0.05, 0])]);
      expect(codes(recorder)).toEqual([]);
    });

    it('should flag blank frames between owners', () => {
      const { recorder, step, now } = createRecorder();
      step([sample('played-card:A', [1, 0.05, 0])]);
      recorder.playedAnimationComplete(now(), 'A');
      recorder.allCardsLanded(now());
      step([]);
      step([]);
      step([sample('collecting-card:A', [1, 0.05, 0])]);
      const gap = recorder.anomalyList().find((anomaly) => anomaly.code === 'handoff-gap');
      expect(gap?.data?.gapFrames).toBe(2);
    });

    it('should flag a positional pop between owners', () => {
      const { recorder, step, now } = createRecorder();
      step([sample('played-card:A', [1, 0.05, 0])]);
      recorder.playedAnimationComplete(now(), 'A');
      recorder.allCardsLanded(now());
      step([sample('collecting-card:A', [1.4, 0.05, 0])]);
      expect(codes(recorder)).toContain('handoff-pop');
    });

    it('should flag the same card drawn by two owners for several frames', () => {
      const { recorder, step, now } = createRecorder();
      recorder.allCardsLanded(now());
      for (let index = 0; index < 4; index++) {
        step([sample('played-card:A', [1, 0.05, 0]), sample('collecting-card:A', [1, 0.05, 0])]);
      }
      expect(codes(recorder)).toContain('double-render');
    });

    it('should report a hand -> table gap however long the card stays hidden', () => {
      const { recorder, step } = createRecorder();
      step([sample('hand-card:A', [0, 0, 0])]);
      for (let index = 0; index < 120; index++) step([]);
      step([sample('played-card:A', [0, 0.3, 2])]);
      const gap = recorder.anomalyList().find((anomaly) => anomaly.code === 'handoff-gap');
      expect(gap?.data?.gapFrames).toBe(120);
    });

    it('should not treat a hidden hand card as the owner a dragged card hands over from', () => {
      const { recorder, step } = createRecorder();
      step([sample('hand-card:A', [0, 0, 0], { visible: false }), sample('dragged-card:A', [0, 0.35, 1])]);
      step([sample('hand-card:A', [0, 0, 0], { visible: false })]);
      step([sample('played-card:A', [0, 0.35, 1])]);
      expect(recorder.anomalyList().find((anomaly) => anomaly.code === 'handoff-gap')?.subject).toBe('dragged-card->played-card:A');
    });

    it('should flag a quick unmount/remount of the same object', () => {
      const { recorder, step } = createRecorder();
      step([sample('deck-card:A', [0, 0.05, 2])]);
      step([]);
      step([sample('deck-card:A', [0, 0.05, 2])]);
      expect(codes(recorder)).toContain('remount-flicker');
    });
  });

  describe('on screen', () => {
    // NDC extents: x and y run from -1 to 1 across the viewport.
    const pastRightEdge = { minX: 0.9, maxX: 1.3, minY: 0, maxY: 0.2 };
    const inside = { minX: -0.5, maxX: 0.5, minY: -0.5, maxY: 0.5 };
    const pokingOut = { minX: 0.6, maxX: 1.06, minY: 0, maxY: 0.2 };

    it('should flag a hand card outside the viewport, but not while the hand animates', () => {
      const animating = createRecorder();
      animating.step([sample('hand-card:A', [0, 0, 0], { ndc: pastRightEdge })], true);
      animating.step([sample('hand-card:A', [0, 0, 0], { ndc: pastRightEdge })], true);
      expect(codes(animating.recorder)).not.toContain('hand-offscreen');

      const resting = createRecorder();
      resting.step([sample('hand-card:A', [0, 0, 0], { ndc: pastRightEdge })]);
      resting.step([sample('hand-card:A', [0, 0, 0], { ndc: pastRightEdge })]);
      expect(codes(resting.recorder)).toContain('hand-offscreen');
    });

    it('should flag a played card that comes to rest outside the viewport, not one still flying', () => {
      const { recorder, step, now } = createRecorder();
      step([sample('played-card:A', [0, 0.3, 0], { ndc: pastRightEdge })]);
      step([sample('played-card:A', [0, 0.3, 0], { ndc: pastRightEdge })]);
      expect(codes(recorder)).not.toContain('played-offscreen');

      recorder.playedAnimationComplete(now(), 'A');
      step([sample('played-card:A', [0, 0.3, 0], { ndc: pastRightEdge })]);
      expect(codes(recorder)).toContain('played-offscreen');
    });

    it('should accept cards inside the viewport or only slightly past its edge', () => {
      const { recorder, step, now } = createRecorder();
      const frame = () => [
        sample('hand-card:A', [0, 0, 0], { ndc: inside }),
        sample('hand-card:B', [0, 0, 0], { ndc: pokingOut }),
        sample('played-card:C', [0, 0.3, 0], { ndc: pokingOut }),
      ];
      step(frame());
      recorder.playedAnimationComplete(now(), 'C');
      step(frame());
      expect(codes(recorder)).toEqual([]);
    });
  });

  describe('perf mode (strided sampling)', () => {
    function createStridedRecorder() {
      const recorder = new AnimationAuditRecorder({ motionChecks: false });
      recorder.start(0);
      recorder.markReady(0);
      return recorder;
    }

    it('should not call a step over skipped frames a teleport', () => {
      const recorder = createStridedRecorder();
      recorder.frame(FRAME, [sample('played-card:A', [0, 0.3, 0])], { handAnimating: false });
      for (let frame = 2; frame < 10; frame++) recorder.frame(frame * FRAME, null, { handAnimating: false });
      recorder.frame(10 * FRAME, [sample('played-card:A', [2, 0.3, 0])], { handAnimating: false });
      expect(codes(recorder)).not.toContain('teleport');
      expect(recorder.metrics().frames).toBe(10);
    });

    it('should keep placement checks and presence tracking on sampled frames', () => {
      const recorder = createStridedRecorder();
      recorder.frame(FRAME, [sample('played-card:A', [0, 0.3, 0])], { handAnimating: false });
      recorder.frame(2 * FRAME, null, { handAnimating: false });
      recorder.frame(3 * FRAME, [sample('played-card:A', [0, -1, 0])], { handAnimating: false });
      expect(codes(recorder)).toContain('below-table');
      expect(recorder.countPresent('played-card')).toBe(1);
    });
  });
});
