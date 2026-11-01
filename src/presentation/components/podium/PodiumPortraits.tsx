'use client';

import { PODIUM } from '@/presentation/config/podium.config';
import type { PodiumStand } from '@/presentation/types/podium.types';

import { CharacterFace } from '../character/CharacterFace';
import { STAGE_WIDTH } from './podium-layout';

/** Step height as a share of the stage's height, so the 2D steps match the 3D ones. */
function stepHeightPercent(stand: PodiumStand): number {
  const stageHeight = STAGE_WIDTH / PODIUM.STAGE_ASPECT;
  return (PODIUM.STEP_HEIGHT[stand.place] / stageHeight) * 100;
}

function portraitPx(stand: PodiumStand): number {
  const size = PODIUM.PORTRAIT_PX[Math.min(stand.occupants.length, PODIUM.PORTRAIT_PX.length) - 1] ?? PODIUM.PORTRAIT_PX[0];
  return stand.place === 1 ? size + PODIUM.PORTRAIT_FIRST_BONUS_PX : size;
}

/**
 * The podium without WebGL figures: each player's portrait (or the silhouette) on a flat step.
 * Fills the stage box CharacterPodium reserves; names are drawn by CharacterPodium.
 */
export function PodiumPortraits({ stands }: { stands: readonly PodiumStand[] }) {
  return (
    <div className="absolute inset-0 flex items-end justify-center">
      {stands.map((stand) => {
        const color = PODIUM.STEP_COLOR[stand.place];
        const size = portraitPx(stand);
        return (
          <div key={stand.place} className="flex h-full w-1/3 flex-col items-center justify-end">
            <div className="flex items-end justify-center gap-1 pb-1.5">
              {stand.occupants.map((contender) => (
                <span
                  key={contender.id}
                  className="block overflow-hidden rounded-full"
                  style={{ width: size, height: size, border: `2px solid ${color}`, background: 'color-mix(in srgb, var(--surface), black 35%)' }}
                >
                  <CharacterFace appearance={contender.appearance} label={contender.name} />
                </span>
              ))}
            </div>
            <div
              className="w-[94%] rounded-t-md border border-b-0"
              style={{
                height: `${stepHeightPercent(stand)}%`,
                borderColor: color,
                background: `linear-gradient(180deg, color-mix(in srgb, ${color} 45%, transparent) 0%, color-mix(in srgb, ${color} 12%, transparent) 100%)`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
