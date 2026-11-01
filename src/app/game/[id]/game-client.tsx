'use client';

import { TournamentJoinGate } from '@/presentation/components/tournament/in-game';

import { useGameClientState } from './useGameClientState';
import { GameClientUI } from './GameClientUI';

interface GameClientProps {
  roomId: string;
}

/** The game page; a seat the game worker refused at a tournament table is explained instead. */
export function GameClient({ roomId }: GameClientProps) {
  return (
    <TournamentJoinGate roomId={roomId}>
      <GameRoom roomId={roomId} />
    </TournamentJoinGate>
  );
}

function GameRoom({ roomId }: GameClientProps) {
  const state = useGameClientState({ roomId });

  return <GameClientUI state={state} roomId={roomId} />;
}
