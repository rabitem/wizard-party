import { describe, expect, it } from 'vitest';

import { CHARACTER_CLIPS } from '@/presentation/config/character.config';
import { reactionToNews, roundReaction, seatClip, type SeatNews } from './seat-reactions';

const human = { isConnected: true, isBot: false };

describe('seat reactions', () => {
  it('should cheer, hop or flinch by the event and the score the server recorded', () => {
    expect(seatClip('trick-won', human)).toBe(CHARACTER_CLIPS.CHEER);
    expect(seatClip(roundReaction({ bid: 2, tricksWon: 2, score: 40 }), human)).toBe(CHARACTER_CLIPS.HOP);
    expect(seatClip(roundReaction({ bid: 2, tricksWon: 0, score: -20 }), human)).toBe(CHARACTER_CLIPS.HIT_A);
    expect(roundReaction({ bid: 0, tricksWon: 1, score: 0 })).toBeNull();
    expect(roundReaction(undefined)).toBeNull();
  });

  it('should react only to news about this seat, and not to news that is gone', () => {
    const seen: SeatNews = { trickWinnerId: null, roundCount: 1, emoteId: null };
    expect(reactionToNews(seen, { ...seen, trickWinnerId: 'p1' }, 'p1', undefined)).toBe('trick-won');
    expect(reactionToNews(seen, { ...seen, trickWinnerId: 'p2' }, 'p1', undefined)).toBeNull();
    expect(reactionToNews(seen, { ...seen, emoteId: 'emote-7' }, 'p1', undefined)).toBe('emote');
    expect(reactionToNews({ ...seen, emoteId: 'emote-7' }, seen, 'p1', undefined)).toBeNull();
    expect(reactionToNews(seen, { ...seen, roundCount: 2 }, 'p1', { bid: 1, tricksWon: 1, score: 30 })).toBe('round-gain');
  });

  it('should sleep while a human is away, but never a bot, and let a reaction wake the figure', () => {
    expect(seatClip(null, { isConnected: false, isBot: false })).toBe(CHARACTER_CLIPS.ASLEEP);
    expect(seatClip(null, { isConnected: false, isBot: true })).toBe(CHARACTER_CLIPS.IDLE);
    expect(seatClip('emote', { isConnected: false, isBot: false })).toBe(CHARACTER_CLIPS.SPELL_RAISE);
  });
});
