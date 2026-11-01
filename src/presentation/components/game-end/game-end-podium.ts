import { getStandings, type IPlayer } from '@shared/domain';
import type { CharacterAppearance } from '@shared/domain/character';

import type { PodiumContender } from '@/presentation/types/podium.types';

// By path: the character barrel would bring the 3D figure into the results page.
import { seatAppearance } from '../character/seat-appearance';

type PodiumPlayer = Pick<IPlayer, 'id' | 'name' | 'score' | 'isBot' | 'botDifficulty' | 'appearance'>;

/**
 * Everyone at the finished table as podium contenders: the domain's ranking (tied scores share a
 * rank, ties keep seat order) and each seat's look by the table's rule (seatAppearance).
 */
export function gameEndContenders(
  players: readonly PodiumPlayer[],
  localPlayerId: string,
  localAppearance: CharacterAppearance | null,
  accountAppearance: (playerId: string) => CharacterAppearance | undefined
): PodiumContender[] {
  const byId = new Map(players.map((player) => [player.id, player]));
  return getStandings(players).flatMap(({ playerId, rank, score }) => {
    const player = byId.get(playerId);
    if (!player) return [];
    const isLocal = playerId === localPlayerId;
    const appearance = seatAppearance(
      { isLocal, isBot: player.isBot, botDifficulty: player.botDifficulty, appearance: player.appearance },
      localAppearance,
      accountAppearance(playerId)
    );
    return [{ id: playerId, rank, name: player.name, appearance, detail: `${score} pts`, isViewer: isLocal }];
  });
}
