'use client';

import { DEFAULT_RULESET_CONFIG, type IGameState } from '@shared/domain';
import type { TournamentMatchRoomState } from '@shared/domain/tournament';

import { useGame } from '../../../providers/GameProvider';
import { AmbientParticles } from '../../room-browser';
import { ClassicAmbienceOnly } from '../../ui';
import { TournamentMatchLobby } from './TournamentMatchLobby';

interface TournamentTableLobbyProps {
  match: TournamentMatchRoomState;
  gameState: IGameState;
}

/** Lobby container for a tournament table: leaving opens the tournament page (useGameNavigation). */
export function TournamentTableLobby({ match, gameState }: TournamentTableLobbyProps) {
  const { isConnected, leaveGame } = useGame();
  return (
    <div className="min-h-full">
      <ClassicAmbienceOnly>
        <AmbientParticles />
      </ClassicAmbienceOnly>
      <div className="relative z-10 max-w-lg md:max-w-2xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <TournamentMatchLobby
          match={match}
          rulesetConfig={gameState.rulesetConfig ?? DEFAULT_RULESET_CONFIG}
          isConnected={isConnected}
          onBackToTournament={() => void leaveGame()}
        />
      </div>
    </div>
  );
}
