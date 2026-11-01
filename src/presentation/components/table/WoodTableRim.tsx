'use client';

import { useEffect } from 'react';
import { IPlayer } from '@shared/domain';
import { preloadCharacterAssets } from '../character/CharacterFigure';
import { StaticBatch } from '../three/batching';
import { PlayerBrandmark, SeatPlate } from './PlayerBrandmark';
import { CupHolders } from './CupHolders';
import { TableLegs } from './TableLegs';
import { WoodRimBase } from './WoodRimBase';
import { LeatherArmrest } from './LeatherArmrest';
import { WoodApron } from './WoodApron';
import { GroundShadow } from './GroundShadow';
import { useTableTextures } from './useTableTextures';
import { useBrandmarkPositions } from './useBrandmarkPositions';
import { useSelectedTableTheme } from './table-theme';

interface WoodTableRimProps {
  players?: IPlayer[];
  localPlayerId?: string;
  currentPlayerIndex?: number;
  /** The player who won the trick being shown, if any (their figure cheers). */
  trickWinnerId?: string | null;
}

/**
 * Main orchestrator component for the wooden table rim.
 * Composes all sub-components: rim base, leather armrest, apron, legs, etc.
 */
export function WoodTableRim({
  players = [],
  localPlayerId,
  currentPlayerIndex = -1,
  trickWinnerId,
}: WoodTableRimProps) {
  // Get texture material properties
  const { woodMaterialProps, leatherMaterialProps } = useTableTextures();

  // Calculate brandmark positions for players
  // Seat figures should be ready before the shader warm-up runs, so it compiles them too.
  const seated = players.length > 0;
  useEffect(() => {
    if (seated) preloadCharacterAssets();
  }, [seated]);

  const brandmarkPositions = useBrandmarkPositions({
    players,
    localPlayerId,
  });
  const tableTheme = useSelectedTableTheme();
  // The batch is rebuilt when the theme (materials) or the seats change, never during play.
  const batchVersion = `${tableTheme.id}|${brandmarkPositions.map(({ pos, rotation }) => `${pos.join(',')},${rotation}`).join(';')}`;

  return (
    <group>
      {/* Static rim and seat plates: one merged mesh per material instead of dozens of draw calls */}
      <StaticBatch version={batchVersion}>
        <WoodRimBase woodMaterialProps={woodMaterialProps} />
        <LeatherArmrest leatherMaterialProps={leatherMaterialProps} />
        <WoodApron woodMaterialProps={woodMaterialProps} />
        <CupHolders count={6} />
        {brandmarkPositions.map(({ pos, rotation }) => (
          <SeatPlate key={`${pos.join(',')}`} position={pos} rotation={rotation} />
        ))}
      </StaticBatch>

      {/* Table legs */}
      <TableLegs />

      {/* Ground shadow */}
      <GroundShadow />

      {/* Player brandmarks burned into the rim */}
      {players.map((player, index) => {
        const posData = brandmarkPositions[index];
        if (!posData) return null;

        return (
          <PlayerBrandmark
            key={player.id}
            position={posData.pos}
            rotation={posData.rotation}
            player={player}
            isCurrentTurn={index === currentPlayerIndex}
            isLocalPlayer={player.id === localPlayerId}
            trickWinnerId={trickWinnerId}
          />
        );
      })}
    </group>
  );
}
