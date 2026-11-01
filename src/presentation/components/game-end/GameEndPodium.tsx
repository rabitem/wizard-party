'use client';

import { useMemo } from 'react';
import type { IPlayer } from '@shared/domain';

import { useLocalAppearance } from '@/presentation/hooks/account/useLocalAppearance';
import { useSocial } from '@/presentation/providers/SocialProvider';

import { CharacterPodium } from '../podium';
import { gameEndContenders } from './game-end-podium';

interface GameEndPodiumProps {
  players: IPlayer[];
  localPlayerId: string;
}

/** The finished table's top three on the podium, each in the look the table showed. */
export function GameEndPodium({ players, localPlayerId }: GameEndPodiumProps) {
  const localAppearance = useLocalAppearance();
  const { roomAccounts } = useSocial();
  const contenders = useMemo(
    () => gameEndContenders(players, localPlayerId, localAppearance, (playerId) => roomAccounts.get(playerId)?.player.appearance),
    [players, localPlayerId, localAppearance, roomAccounts]
  );
  return <CharacterPodium contenders={contenders} />;
}
