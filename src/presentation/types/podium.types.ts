import type { CharacterAppearance } from '@shared/domain/character';

/** A podium step: first, second or third place. */
export type PodiumPlace = 1 | 2 | 3;

/** One ranked player who may stand on the podium (components/podium). */
export interface PodiumContender {
  id: string;
  /**
   * 1-based rank from the ranking that owns it (getStandings at game end, the tournament
   * standings). Tied players share a rank and so a step.
   */
  rank: number;
  name: string;
  /** null: a silhouette (a guest, or a player whose look the viewer does not know). */
  appearance: CharacterAppearance | null;
  /** Line under the name, e.g. "120 pts". */
  detail: string;
  isViewer: boolean;
}

/** One taken step, with the players standing on it in ranking order. */
export interface PodiumStand {
  place: PodiumPlace;
  /** At most PODIUM.MAX_PER_STEP players. */
  occupants: PodiumContender[];
  /** Tied players on this step beyond the ones shown. */
  hidden: number;
}

/** 3D figures, or 2D portraits (no WebGL, low render tier, or the 3D view failed). */
export type PodiumRenderMode = 'figures' | 'portraits';
