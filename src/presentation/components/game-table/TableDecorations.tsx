'use client';

import { memo } from 'react';
import { IPlayer, ICard, GamePhase } from '@shared/domain';
import {
  TrickWinParticles,
  SparkleParticles,
} from '../three';
import {
  PhysicsChipStacks,
  PhysicsCoasters,
  StackedDeck,
} from '../table';
import { getStackedDeckPosition } from '../table/stacked-deck-layout';
import type { PlayerPosition } from './types';

interface TableDecorationsProps {
  gamePhase?: GamePhase;
  trickWinnerId?: string | null;
}

/**
 * Memoized: the chip stacks and coasters are hundreds of static physics components; they must not
 * re-render with every game snapshot (their props never change).
 */
function TableDecorationsView({
  gamePhase,
  trickWinnerId,
}: TableDecorationsProps) {
  return (
    <>
      {/* TRICK WIN PARTICLE EFFECTS - during PLAYING, ROUND_END, or GAME_END */}
      <TrickWinParticles
        position={[0, 0.3, 0]}
        active={(gamePhase === GamePhase.PLAYING || gamePhase === GamePhase.ROUND_END || gamePhase === GamePhase.GAME_END) && !!trickWinnerId}
        color="#ffd700"
      />

      {/* AMBIENT SPARKLES on table center */}
      <SparkleParticles position={[0, 0.05, 0]} radius={0.6} count={20} color="#ffd700" />

      {/* PHYSICS-ENABLED DECORATIVE ELEMENTS */}
      <PhysicsChipStacks />
      <PhysicsCoasters />
    </>
  );
}

export const TableDecorations = memo(TableDecorationsView);

interface StackedDecksRendererProps {
  players: IPlayer[];
  playerPositions: PlayerPosition[];
  playerDecks: Map<string, ICard[]>;
}

export function StackedDecksRenderer({
  players,
  playerPositions,
  playerDecks,
}: StackedDecksRendererProps) {
  return (
    <>
      {players.map((player, index) => {
        const collectedCards = playerDecks.get(player.id);
        if (!collectedCards || collectedCards.length === 0) return null;

        const pos = playerPositions[index];
        if (!pos) return null;

        const deckPosition = getStackedDeckPosition(pos.seatPos);

        return (
          <StackedDeck
            key={`deck-${player.id}`}
            cards={collectedCards}
            position={deckPosition}
            rotation={pos.rotation}
          />
        );
      })}
    </>
  );
}
