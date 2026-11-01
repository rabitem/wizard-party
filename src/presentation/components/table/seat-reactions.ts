import type { IPlayer, RoundHistoryEntry } from '@shared/domain';

import { CHARACTER_CLIPS, type CharacterClip } from '@/presentation/config/character.config';

/**
 * How an opponent's figure reacts to the game. Every reaction comes from something the client
 * was told (a trick's winner, a round's score, an emote, a dropped connection); nothing here
 * judges the game itself.
 */
export type SeatReaction = 'trick-won' | 'round-gain' | 'round-loss' | 'emote';

export const REACTION_CLIPS: Readonly<Record<SeatReaction, CharacterClip>> = {
  'trick-won': CHARACTER_CLIPS.CHEER,
  'round-gain': CHARACTER_CLIPS.HOP,
  'round-loss': CHARACTER_CLIPS.HIT_A,
  emote: CHARACTER_CLIPS.SPELL_RAISE,
};

/** A new round result, by the sign of the score the server recorded; an even round gets none. */
export function roundReaction(entry: RoundHistoryEntry | undefined): SeatReaction | null {
  if (!entry || entry.score === 0) return null;
  return entry.score > 0 ? 'round-gain' : 'round-loss';
}

/** The clip a seat's figure plays: a running reaction first, asleep while its human is away, else idle. */
export function seatClip(reaction: SeatReaction | null, player: Pick<IPlayer, 'isConnected' | 'isBot'>): CharacterClip {
  if (reaction) return REACTION_CLIPS[reaction];
  if (!player.isBot && !player.isConnected) return CHARACTER_CLIPS.ASLEEP;
  return CHARACTER_CLIPS.IDLE;
}

/** What a seat's figure last heard about: the trick winner, how many rounds were scored, the newest emote. */
export interface SeatNews {
  trickWinnerId: string | null;
  roundCount: number;
  emoteId: string | null;
}

/** The reaction news since `seen` calls for, newest kind first: an emote, a round, a won trick. */
export function reactionToNews(seen: SeatNews, now: SeatNews, playerId: string, lastRound: RoundHistoryEntry | undefined): SeatReaction | null {
  if (now.emoteId !== null && now.emoteId !== seen.emoteId) return 'emote';
  if (now.roundCount > seen.roundCount) return roundReaction(lastRound);
  if (now.trickWinnerId !== seen.trickWinnerId && now.trickWinnerId === playerId) return 'trick-won';
  return null;
}
