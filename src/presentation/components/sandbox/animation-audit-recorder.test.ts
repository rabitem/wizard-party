import { DEFAULT_THRESHOLDS, type ObjectSample } from 'three-motion-audit';
import { describe, expect, it } from 'vitest';
import { AnimationAuditRecorder } from './animation-audit-recorder';
import { FRAME, codes, createRecorder, sample } from './animation-audit-recorder.fixtures';
import { CAMERA_TRACK } from './card-motion-audit';

// The motion checks themselves are three-motion-audit's and tested there. These tests cover what
// Wizard Party configures: which checks each kind of card gets, the report's codes, handoffs
// between card owners, and when judging starts.

/** Frames for a still object to count as resting, after which its place on screen is judged. */
const RESTING_FRAMES = DEFAULT_THRESHOLDS.restFrames + 2;

describe('AnimationAuditRecorder', () => {
  describe('motion', () => {
    it('should accept smooth card motion', () => {
      const { recorder, step } = createRecorder();
      for (let index = 0; index < 30; index++) step([sample('played-card:A', [index * 0.05, 0.3, 0])]);
      expect(codes(recorder)).toEqual([]);
    });

    it('should flag a card that jumps across the table in one frame', () => {
      const { recorder, step } = createRecorder();
      step([sample('played-card:A', [0, 0.3, 0])]);
      step([sample('played-card:A', [2, 0.3, 0])]);
      expect(codes(recorder)).toContain('teleport');
    });

    it('should not judge the speed of a dragged card, which follows the pointer', () => {
      const { recorder, step } = createRecorder();
      step([sample('dragged-card:A', [0, 0.4, 1])]);
      step([sample('dragged-card:A', [2, 0.4, 1])]);
      expect(codes(recorder)).toEqual([]);
    });

    it('should judge hand cards on screen: gliding back toward the camera is not a jump', () => {
      const { recorder, step } = createRecorder();
      const screen = (cx: number, size: number) => ({ minX: cx - size / 2, maxX: cx + size / 2, minY: -0.9, maxY: -0.9 + size });
      step([sample('hand-card:A', [0, 1, 2.3], { screen: screen(-0.07, 0.1) })]);
      step([sample('hand-card:A', [0, 1.4, 2.8], { screen: screen(-0.08, 0.12) })]);
      expect(codes(recorder)).not.toContain('teleport');

      step([sample('hand-card:A', [0, 1.4, 2.8], { screen: screen(0.5, 0.12) })]);
      expect(codes(recorder)).toContain('teleport');
    });

    it('should report a camera cut as camera-jump', () => {
      const { recorder, step } = createRecorder();
      const camera = (z: number): ObjectSample => ({ id: CAMERA_TRACK, role: CAMERA_TRACK, position: [0, 5, z] });
      for (let index = 0; index < 3; index++) step([camera(5)]);
      step([camera(6)]);
      expect(codes(recorder)).toEqual(['camera-jump']);
    });

    it('should flag non-finite transforms and cards below the felt', () => {
      const { recorder, step } = createRecorder();
      step([sample('played-card:A', [0, 0.3, 0])]);
      step([sample('played-card:A', [0, -0.2, 0])]);
      step([sample('collecting-card:B', [Number.NaN, 0.3, 0])]);
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
      recorder.frame(FRAME, [sample('played-card:A', [0, 0.3, 0])]);
      recorder.frame(2 * FRAME, [sample('played-card:A', [3, 0.3, 0])]);
      expect(codes(recorder)).not.toContain('teleport');
    });

    it('should judge from the ready frame on, without re-announcing cards already on the table', () => {
      const recorder = new AnimationAuditRecorder();
      recorder.start(0);
      recorder.frame(FRAME, [sample('played-card:A', [0, 0.3, 0])]);
      recorder.markReady(FRAME);
      recorder.frame(2 * FRAME, [sample('played-card:A', [0, 0.3, 0])]);
      recorder.frame(3 * FRAME, [sample('played-card:A', [2, 0.3, 0])]);
      expect(codes(recorder)).toEqual(['teleport']);
      expect(recorder.timelineEntries().filter((entry) => entry.kind === 'mount')).toHaveLength(1);
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
      expect(recorder.anomalyList().find((anomaly) => anomaly.code === 'handoff-gap')?.subject).toBe('dragged-card:A->played-card:A');
    });

    it('should not hand a card over from the previous round\'s pile, since card ids repeat', () => {
      const { recorder, step } = createRecorder();
      step([sample('deck-card:A', [3, 0.05, 3])]);
      step([]);
      step([sample('played-card:A', [0, 0.3, 0])]);
      expect(codes(recorder)).toEqual([]);
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

    it('should flag a hand card that rests outside the viewport, not one moving past its edge', () => {
      const moving = createRecorder();
      for (let index = 0; index < RESTING_FRAMES; index++) {
        moving.step([sample('hand-card:A', [0, 0, 0], { screen: { ...pastRightEdge, minY: index * 0.01, maxY: 0.2 + index * 0.01 } })]);
      }
      expect(codes(moving.recorder)).not.toContain('hand-offscreen');

      const resting = createRecorder();
      for (let index = 0; index < RESTING_FRAMES; index++) resting.step([sample('hand-card:A', [0, 0, 0], { screen: pastRightEdge })]);
      expect(codes(resting.recorder)).toContain('hand-offscreen');
    });

    it('should flag a played card that comes to rest outside the viewport, not one still flying', () => {
      const { recorder, step } = createRecorder();
      for (let index = 0; index < RESTING_FRAMES; index++) step([sample('played-card:A', [index * 0.05, 0.3, 0], { screen: pastRightEdge })]);
      expect(codes(recorder)).not.toContain('played-offscreen');

      const landed = (RESTING_FRAMES - 1) * 0.05;
      for (let index = 0; index < RESTING_FRAMES; index++) step([sample('played-card:A', [landed, 0.3, 0], { screen: pastRightEdge })]);
      expect(codes(recorder)).toContain('played-offscreen');
    });

    it('should accept cards inside the viewport or only slightly past its edge', () => {
      const { recorder, step } = createRecorder();
      for (let index = 0; index < RESTING_FRAMES; index++) {
        step([
          sample('hand-card:A', [0, 0, 0], { screen: inside }),
          sample('hand-card:B', [0, 0, 0], { screen: pokingOut }),
          sample('played-card:C', [0, 0.3, 0], { screen: pokingOut }),
        ]);
      }
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
      recorder.frame(FRAME, [sample('played-card:A', [0, 0.3, 0])]);
      for (let frame = 2; frame < 10; frame++) recorder.frame(frame * FRAME, null);
      recorder.frame(10 * FRAME, [sample('played-card:A', [2, 0.3, 0])]);
      expect(codes(recorder)).not.toContain('teleport');
      expect(recorder.metrics().frames).toBe(10);
    });

    it('should keep placement checks and presence tracking on sampled frames', () => {
      const recorder = createStridedRecorder();
      recorder.frame(FRAME, [sample('played-card:A', [0, 0.3, 0])]);
      recorder.frame(2 * FRAME, null);
      recorder.frame(3 * FRAME, [sample('played-card:A', [0, -1, 0])]);
      expect(codes(recorder)).toContain('below-table');
      expect(recorder.countPresent('played-card')).toBe(1);
    });
  });
});
