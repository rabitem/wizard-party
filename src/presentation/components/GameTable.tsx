'use client';

import { memo } from 'react';
import { GamePhase } from '@shared/domain';
import {
  TableSurface,
  PhysicsTrumpIndicator,
  TrumpIndicatorLight,
} from './table';
import {
  useCardLandingTracking,
  useCollectingAnimation,
  usePlayerPositions,
  PlayerAreaRenderer,
  CollectingCardsRenderer,
  TableDecorations,
  StackedDecksRenderer,
  type GameTableProps,
} from './game-table';

export type { GameTableProps };

/** Checks if trump indicator should be visible in current phase */
function shouldShowTrumpIndicator(phase: GamePhase | undefined): boolean {
  return phase === GamePhase.BIDDING ||
    phase === GamePhase.TRUMP_SELECTION ||
    phase === GamePhase.PLAYING;
}

function GameTableView({
  currentTrick,
  players,
  localPlayerId,
  trumpSuit,
  currentPlayerIndex,
  dealerIndex,
  trickWinnerId,
  onCardLand,
  onTrickCollectComplete,
  onAllCardsLanded,
  gamePhase,
  pendingDropInfo,
  isWaitingForCardsToLand,
  getCardPhysicsState,
  shouldShowPlayedCard,
  shouldAnimatePlayedCard,
  onPlayedCardAnimationComplete,
  collectionAnimationMode,
}: GameTableProps) {
  // Card landing tracking
  const { handlePlayedCardImpact, handlePlayedCardRest, markPlayedCardAlreadyRested } = useCardLandingTracking({
    currentTrick,
    isWaitingForCardsToLand,
    onCardLand,
    onAllCardsLanded,
  });

  // Collecting animation state
  const { playerDecks, frozenCollectingCards, handleCollectingCardComplete } = useCollectingAnimation({
    trickWinnerId,
    currentTrick,
    gamePhase,
    onTrickCollectComplete,
  });

  // Calculate player positions around table
  const playerPositions = usePlayerPositions({
    players,
    localPlayerId,
  });

  return (
    <group>
      {/* TABLE SURFACE */}
      <TableSurface players={players} localPlayerId={localPlayerId} currentPlayerIndex={currentPlayerIndex} />

      {/* PHYSICS-ENABLED TRUMP INDICATOR - only show during active gameplay phases */}
      {shouldShowTrumpIndicator(gamePhase) && <PhysicsTrumpIndicator suit={trumpSuit} />}
      <TrumpIndicatorLight suit={trumpSuit} active={shouldShowTrumpIndicator(gamePhase)} />

      {/* PLAYER AREAS */}
      <PlayerAreaRenderer
        players={players}
        playerPositions={playerPositions}
        localPlayerId={localPlayerId}
        currentPlayerIndex={currentPlayerIndex}
        dealerIndex={dealerIndex}
        currentTrick={currentTrick}
        trickWinnerId={trickWinnerId}
        gamePhase={gamePhase}
        isWaitingForCardsToLand={isWaitingForCardsToLand}
        pendingDropInfo={pendingDropInfo}
        getCardPhysicsState={getCardPhysicsState}
        shouldShowPlayedCard={shouldShowPlayedCard}
        shouldAnimatePlayedCard={shouldAnimatePlayedCard}
        onPlayedCardImpact={handlePlayedCardImpact}
        onPlayedCardRest={handlePlayedCardRest}
        onPlayedCardAlreadyRested={markPlayedCardAlreadyRested}
        onPlayedCardAnimationComplete={onPlayedCardAnimationComplete}
      />

      {/* COLLECTING CARDS ANIMATION */}
      <CollectingCardsRenderer
        players={players}
        playerPositions={playerPositions}
        localPlayerId={localPlayerId}
        gamePhase={gamePhase}
        frozenCollectingCards={frozenCollectingCards}
        playerDecks={playerDecks}
        pendingDropInfo={pendingDropInfo}
        getCardPhysicsState={getCardPhysicsState}
        onCollectingCardComplete={handleCollectingCardComplete}
        collectionAnimationMode={collectionAnimationMode}
      />

      {/* DECORATIONS AND PARTICLES */}
      <TableDecorations
        gamePhase={gamePhase}
        trickWinnerId={trickWinnerId}
      />

      {/* STACKED DECKS - Persistent collected cards for each player */}
      <StackedDecksRenderer
        players={players}
        playerPositions={playerPositions}
        playerDecks={playerDecks}
      />
    </group>
  );
}

/** Memoized: a snapshot that changed nothing it shows (structurally shared) skips it. */
export const GameTable = memo(GameTableView);
