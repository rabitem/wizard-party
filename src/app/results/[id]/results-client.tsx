'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { Loader2 } from 'lucide-react';
import { GamePhase } from '@shared/domain';
import { useGame } from '@/presentation/providers/GameProvider';
import { useTournamentTable } from '@/presentation/providers/TournamentTableProvider';
import { GameEndUI } from '@/presentation/components/GameEndUI';
import { ConnectionStatusOverlay } from '@/presentation/components/overlays';

import { resolveResultsRedirect } from './results-redirect';


interface ResultsClientProps {
  roomId: string;
}

export function ResultsClient({ roomId }: ResultsClientProps) {
  const router = useRouter();

  const {
    connectionStatus,
    error,
    sessionLoaded,
    gameState,
    playerId,
    leaveGame,
    requestRematch,
    takeOverSeat,
    retryConnection,
  } = useGame();
  const { match: tournamentMatch } = useTournamentTable();
  // While leaving, the provider navigates (home or the tournament): the redirect below must not race it.
  const leavingRef = useRef(false);

  // Check if we're in the right room and phase
  const isCorrectRoom = gameState?.id === roomId;
  const isGameEnd = gameState?.phase === GamePhase.GAME_END;
  const hasError = error !== null;

  // Redirect if the seat is gone or elsewhere (phase changes are routed by the GameProvider)
  useEffect(() => {
    const target = resolveResultsRedirect({
      sessionLoaded, isLeaving: leavingRef.current, status: connectionStatus, hasError, gameState, playerId, isCorrectRoom,
    });
    if (target) router.replace(target);
  }, [sessionLoaded, connectionStatus, hasError, gameState, playerId, isCorrectRoom, router]);



  // Handle play again
  const handlePlayAgain = () => {
    requestRematch();
  };

  // Handle return to lobby (leave game and go home; a tournament match leads back to its tournament)
  const handleReturnToLobby = () => {
    leavingRef.current = true;
    leaveGame();
  };

  // Show loading while session is loading
  if (!sessionLoaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
      >
        <div className="flex items-center gap-3 text-amber-400/70">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-serif">Loading...</span>
        </div>
      </div>
    );
  }

  // Show loading until the results of this room are there (they stay up while reconnecting)
  if (!gameState || !playerId || !isCorrectRoom || !isGameEnd) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
      >
        <div className="flex items-center gap-3 text-amber-400/70">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-serif">Loading results...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-screen relative overflow-hidden"
    >
      <GameEndUI
        players={gameState.players}
        localPlayerId={playerId}
        maxRounds={gameState.maxRounds}
        onPlayAgain={handlePlayAgain}
        onReturnToLobby={handleReturnToLobby}
        tournament={tournamentMatch ? { match: tournamentMatch, onBackToTournament: handleReturnToLobby } : null}
      />
      <ConnectionStatusOverlay status={connectionStatus} onTakeOver={takeOverSeat} onRetry={retryConnection} onLeave={handleReturnToLobby} />
    </div>
  );
}
