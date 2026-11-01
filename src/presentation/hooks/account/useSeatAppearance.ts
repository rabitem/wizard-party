'use client';

import type { IPlayer } from '@shared/domain';
import type { CharacterAppearance } from '@shared/domain/character';

import { seatAppearance } from '@/presentation/components/character/seat-appearance';
import { useSocial } from '@/presentation/providers/SocialProvider';
import { useLocalAppearance } from './useLocalAppearance';

/** The look of a player at the table, by the same rule as the lobby seats (seatAppearance). */
export function useSeatAppearance(player: Pick<IPlayer, 'id' | 'isBot' | 'botDifficulty'>, isLocal: boolean): CharacterAppearance | null {
  const own = useLocalAppearance();
  const { roomAccounts } = useSocial();
  return seatAppearance({ isLocal, isBot: player.isBot, botDifficulty: player.botDifficulty }, own, roomAccounts.get(player.id)?.player.appearance);
}
