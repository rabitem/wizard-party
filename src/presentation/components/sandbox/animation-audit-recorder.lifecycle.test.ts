import { describe, expect, it } from 'vitest';
import { codes, createRecorder, sample } from './animation-audit-recorder.fixtures';

describe('AnimationAuditRecorder', () => {
  describe('trick lifecycle', () => {
    it('should flag overlapping play animations', () => {
      const { recorder, step } = createRecorder();
      step([sample('played-card:A', [0, 0.3, 0])]);
      step([sample('played-card:A', [0, 0.3, 0]), sample('played-card:B', [1, 0.3, 0])]);
      expect(codes(recorder)).toContain('overlapping-play-animations');
    });

    it('should let the local player card fly alongside an opponent card', () => {
      const { recorder, step, now } = createRecorder();
      recorder.serverMessage(now(), 'CARD_PLAYED', { cardId: 'A' });
      recorder.serverMessage(now(), 'CARD_PLAYED', { cardId: 'B', isLocalPlayer: true });
      step([sample('played-card:A', [0, 0.3, 0])]);
      step([sample('played-card:A', [0, 0.3, 0]), sample('played-card:B', [1, 0.3, 0])]);
      expect(codes(recorder)).not.toContain('overlapping-play-animations');
    });

    it('should allow the trick result to activate on the frame the last card completes', () => {
      const { recorder, step, now } = createRecorder();
      step([sample('played-card:A', [0, 0.3, 0])]);
      recorder.allCardsLanded(now());
      recorder.playedAnimationComplete(now(), 'A');
      step([sample('played-card:A', [0, 0.3, 0])]);
      step([sample('played-card:A', [0, 0.3, 0])]);
      expect(codes(recorder)).not.toContain('premature-all-landed');
    });

    it('should flag a trick result that activates while a card is still flying', () => {
      const { recorder, step, now } = createRecorder();
      step([sample('played-card:A', [0, 0.3, 0])]);
      recorder.allCardsLanded(now());
      for (let index = 0; index < 4; index++) step([sample('played-card:A', [index * 0.05, 0.3, 0])]);
      expect(codes(recorder)).toContain('premature-all-landed');
    });

    it('should flag collection that starts before the trick reported all cards landed', () => {
      const { recorder, step } = createRecorder();
      step([sample('collecting-card:A', [0, 0.05, 0])]);
      expect(codes(recorder)).toContain('collect-before-landed');
    });

    it('should flag a collection completion while cards are still moving', () => {
      const { recorder, step, now } = createRecorder();
      recorder.allCardsLanded(now());
      step([sample('collecting-card:A', [0, 0.05, 0])]);
      step([sample('collecting-card:A', [0.1, 0.05, 0])]);
      recorder.trickCollectComplete(now());
      expect(codes(recorder)).toContain('premature-collect-complete');
    });

    it('should report announced cards that never animated and stuck state at the end', () => {
      const { recorder, step, now } = createRecorder();
      recorder.serverMessage(now(), 'CARD_PLAYED', { cardId: 'A' });
      recorder.serverMessage(now(), 'TRICK_COMPLETE', { trickCardIds: ['A'] });
      step([sample('hand-card:B', [0, 0, 0])]);
      recorder.finish(now(), {
        trickResult: true,
        pendingTrickResult: false,
        isTrickAnimating: false,
        handAnimation: 'sort',
        localHandSize: 2,
        phase: 'PLAYING',
      });
      expect(codes(recorder)).toEqual(expect.arrayContaining([
        'skipped-play-animation',
        'skipped-collection',
        'trick-state-stuck',
        'hand-animation-stuck',
        'hand-count-mismatch',
      ]));
    });
  });

  describe('scene and round boundaries', () => {
    it('should not report a whole-scene teardown as stuck collection', () => {
      const { recorder, step, now } = createRecorder();
      recorder.allCardsLanded(now());
      step([sample('collecting-card:A', [0, 0.3, 0])]);
      recorder.sceneUnmounted(now());
      recorder.finish(now(), { trickResult: false, pendingTrickResult: false, isTrickAnimating: false, handAnimation: 'none', localHandSize: null, phase: 'GAME_END' });
      expect(codes(recorder)).toEqual([]);
    });

    it('should scope per-card bookkeeping to a round, since card ids repeat after the reshuffle', () => {
      const { recorder, step, now } = createRecorder();
      recorder.serverMessage(now(), 'CARD_PLAYED', { cardId: 'A' });
      step([sample('played-card:A', [0, 0.3, 0])]);
      recorder.cardLanded(now(), 'A');
      recorder.serverMessage(now(), 'TRUMP_REVEALED');
      recorder.cardLanded(now(), 'A');
      expect(codes(recorder)).not.toContain('duplicate-land');
    });
  });
});
