'use client';

import { HudSlot, TurnTimerSoundboard } from '@/presentation/components/hud';
import type { TurnTimerPlacement } from '@/presentation/types/hud-layout.types';
import type { useGameClientState } from './useGameClientState';

type GameClientState = ReturnType<typeof useGameClientState>;

interface TurnTimerSectionProps {
  gameState: NonNullable<GameClientState['gameState']>;
  playerId: string;
  /** Region and popover direction from the layout policy */
  placement: TurnTimerPlacement;
  sharedCustomSounds: GameClientState['sharedCustomSounds'];
  onPlayTimeoutSound: GameClientState['playTimeoutSound'];
}

/** Turn timer in the HUD region the layout policy assigns (never over the player's hand). */
export function TurnTimerSection({
  gameState,
  playerId,
  placement,
  sharedCustomSounds,
  onPlayTimeoutSound,
}: TurnTimerSectionProps) {
  if (!gameState.turnTimerState) return null;
  return (
    <HudSlot region={placement.region} order={placement.order}>
      <TurnTimerSoundboard
        gameState={gameState}
        playerId={playerId}
        placement={placement}
        sharedCustomSounds={sharedCustomSounds}
        onPlayTimeoutSound={onPlayTimeoutSound}
      />
    </HudSlot>
  );
}
