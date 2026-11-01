import type { RenderQualityTier } from '@/presentation/config/render-quality.config';
import { PODIUM } from '@/presentation/config/podium.config';
import type { PodiumContender, PodiumPlace, PodiumRenderMode, PodiumStand } from '@/presentation/types/podium.types';

/** Steps left to right: second, first (the tallest, in the middle), third. */
const STAGE_ORDER: readonly PodiumPlace[] = [2, 1, 3];

function isPlace(rank: number): rank is PodiumPlace {
  return rank === 1 || rank === 2 || rank === 3;
}

/**
 * The taken steps, left to right. A player stands on the step of their rank, so tied players
 * share a step and the step after a tie stays empty (ranks 1, 1, 3: no second step). Steps nobody
 * reached are left out. Contenders come in ranking order and keep it on their step.
 */
export function podiumStands(contenders: readonly PodiumContender[], maxPerStep: number = PODIUM.MAX_PER_STEP): PodiumStand[] {
  const byPlace = new Map<PodiumPlace, PodiumContender[]>();
  for (const contender of contenders) {
    if (!isPlace(contender.rank)) continue;
    const step = byPlace.get(contender.rank) ?? [];
    step.push(contender);
    byPlace.set(contender.rank, step);
  }
  return STAGE_ORDER.flatMap((place) => {
    const standing = byPlace.get(place);
    if (!standing) return [];
    return [{ place, occupants: standing.slice(0, maxPerStep), hidden: Math.max(0, standing.length - maxPerStep) }];
  });
}

/** 3D figures where the device renders the table above the low tier; portraits otherwise. */
export function podiumRenderMode(webgl: boolean, tier: RenderQualityTier): PodiumRenderMode {
  return webgl && PODIUM.FIGURE_TIERS.includes(tier) ? 'figures' : 'portraits';
}

/** Centre of a step on the x axis: steps are STEP_WIDTH apart and centred on the stage. */
export function stepCenterX(index: number, steps: number): number {
  return (index - (steps - 1) / 2) * PODIUM.STEP_WIDTH;
}

/** Where the players sharing a step stand (x from the step's centre) and how large they are. */
export function figureSlots(count: number): { offsets: number[]; scale: number } {
  const spacing = PODIUM.STEP_WIDTH / Math.max(count, 1);
  const offsets = Array.from({ length: count }, (_, index) => (index - (count - 1) / 2) * spacing);
  const scale = PODIUM.FIGURE_SCALE[Math.min(count, PODIUM.FIGURE_SCALE.length) - 1] ?? PODIUM.FIGURE_SCALE[0];
  return { offsets, scale };
}

/** Width of the stage in model units: always three steps. */
export const STAGE_WIDTH = PODIUM.STEP_WIDTH * STAGE_ORDER.length;

/** Ordinal label of a step. */
export function placeLabel(place: PodiumPlace): string {
  return { 1: '1st', 2: '2nd', 3: '3rd' }[place];
}
