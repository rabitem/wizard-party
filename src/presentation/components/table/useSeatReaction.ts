'use client';

import { useState } from 'react';
import type { IPlayer } from '@shared/domain';

import { useTableFeed } from '@/presentation/providers/game-client-context';
import { reactionToNews, type SeatNews, type SeatReaction } from './seat-reactions';

export interface PlayedReaction {
  reaction: SeatReaction;
  /** Grows with every reaction, so two of the same kind in a row each play. */
  serial: number;
}

/**
 * The latest reaction news for an opponent's figure: a trick it won, a round's result, an emote
 * its player sent. The figure plays it once and settles back by itself (CharacterFigure's
 * oneShot), on the scene's clock, so nothing here waits or re-renders to end it.
 */
export function useSeatReaction(player: Pick<IPlayer, 'id' | 'roundHistory'>, trickWinnerId: string | null | undefined): PlayedReaction | null {
  const { emotes } = useTableFeed();
  const news: SeatNews = {
    trickWinnerId: trickWinnerId ?? null,
    roundCount: player.roundHistory.length,
    emoteId: emotes.findLast((emote) => emote.playerId === player.id)?.id ?? null,
  };
  // What was already true when the figure appeared is old news: it starts at rest.
  const [seen, setSeen] = useState<SeatNews>(news);
  const [latest, setLatest] = useState<PlayedReaction | null>(null);

  if (seen.trickWinnerId !== news.trickWinnerId || seen.roundCount !== news.roundCount || seen.emoteId !== news.emoteId) {
    const reaction = reactionToNews(seen, news, player.id, player.roundHistory.at(-1));
    setSeen(news);
    if (reaction) setLatest({ reaction, serial: (latest?.serial ?? 0) + 1 });
  }

  return latest;
}
