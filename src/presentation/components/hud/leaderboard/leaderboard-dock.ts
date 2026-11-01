import { STANDINGS_DOCK_CONFIG } from '@/presentation/config/responsive.config';
import type {
  HudRegion,
  LayoutPolicy,
  LayoutProfile,
  LeaderboardPosition,
  StandingsMode,
} from '@/presentation/types/hud-layout.types';
import { LEADERBOARD_PANEL_DEFAULT_WIDTH } from './leaderboard-layout';

/**
 * Whether a side panel of `panelWidth` fits beside the table without covering seats: the camera
 * centres the table, so each side keeps half of what the table's footprint leaves free.
 */
export function canDockSidePanel(profile: LayoutProfile, panelWidth = LEADERBOARD_PANEL_DEFAULT_WIDTH): boolean {
  const tableWidth = Math.min(profile.width, profile.height * STANDINGS_DOCK_CONFIG.TABLE_FOOTPRINT_HEIGHT_RATIO);
  const freeSideWidth = (profile.width - tableWidth) / 2;
  return freeSideWidth >= panelWidth + STANDINGS_DOCK_CONFIG.EDGE_GUTTER_PX;
}

/**
 * How the standings are shown for the player's position preference on this layout:
 * a sheet on the phone HUD, docked when it fits beside the table, otherwise a top-bar popover.
 */
export function resolveStandingsMode(policy: LayoutPolicy, position: LeaderboardPosition): StandingsMode {
  if (policy.compactHud) return 'sheet';
  if (position === 'hidden') return 'popover';
  if (position === 'bottom') return 'docked';
  return canDockSidePanel(policy.profile) ? 'docked' : 'popover';
}

/** HUD region a docked standings panel renders into. */
export function getStandingsDockRegion(position: Exclude<LeaderboardPosition, 'hidden'>): HudRegion {
  if (position === 'left') return 'dock-left';
  if (position === 'right') return 'dock-right';
  return 'bottom';
}
