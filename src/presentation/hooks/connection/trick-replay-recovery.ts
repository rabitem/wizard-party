import type { ICard, IGameState } from '@shared/domain';

export interface MissedTrickCompleteReplay {
  winnerId: string;
  winnerName: string;
  soundChoice: string | undefined;
  trickCards: { playerId: string; card: ICard }[];
  trickIndex: number;
  currentState: IGameState;
  timestamp: number;
}

/**
 * A new round (or a rematch) started. The previous round's last trick may still be
 * landing or being collected; its animation state must not leak into the new round.
 */
export function hasRoundChanged(previousState: IGameState | null, nextState: IGameState): boolean {
  return !!previousState && previousState.currentRound !== nextState.currentRound;
}

export function getMissedTrickCompleteReplay({
  previousState,
  nextState,
  eventTimestamp,
}: {
  previousState: IGameState | null;
  nextState: IGameState;
  eventTimestamp: number;
}): MissedTrickCompleteReplay | null {
  if (!previousState) return null;

  const previousCompletedCount = previousState.completedTricks?.length ?? 0;
  const nextCompletedCount = nextState.completedTricks?.length ?? 0;
  if (nextCompletedCount <= previousCompletedCount) return null;

  const trickIndex = nextCompletedCount - 1;
  const completedTrick = nextState.completedTricks?.[trickIndex];
  if (!completedTrick?.winnerId || !completedTrick.cards?.length) return null;

  const winnerName = nextState.players.find((player) => player.id === completedTrick.winnerId)?.name;
  if (!winnerName) return null;

  return {
    winnerId: completedTrick.winnerId,
    winnerName,
    soundChoice: undefined,
    trickCards: completedTrick.cards,
    trickIndex,
    currentState: nextState,
    timestamp: eventTimestamp,
  };
}
