import { Leaf, SOLARPUNK_ICONS } from '@/presentation/components/hud/skins/solarpunk/solarpunk-icons';
import { SOLARPUNK_PALETTE as C } from '@/presentation/components/hud/skins/solarpunk/solarpunk-palette';
import type { LobbyIconComponent, LobbyIconId } from '../lobby-skin.types';

/** Empty seat: a wooden planter with a brass band and a fresh seedling (24x24 grid like lucide). */
function PlanterIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      <path d="M12 14V7" stroke={C.leafDark} strokeWidth={1.4} />
      <Leaf x={12} y={10} length={6} angle={-55} />
      <Leaf x={12} y={8} length={5} angle={50} color={C.leafLight} />
      <path d="M4 14H20L18.4 21H5.6Z" fill={C.soil} stroke={C.outline} strokeWidth={0.8} />
      <rect x={3.4} y={13} width={17.2} height={2.6} rx={0.8} fill={C.brass} stroke={C.brassDark} strokeWidth={0.7} />
      <circle cx={6} cy={14.3} r={0.6} fill={C.brassLight} />
      <circle cx={18} cy={14.3} r={0.6} fill={C.brassLight} />
    </svg>
  );
}

/** Add bot: a little gardening drone with two rotors and a glass eye. */
function DroneIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      <path d="M5 8H19M7 8V11M17 8V11" stroke={C.brassDark} strokeWidth={1.4} />
      <ellipse cx={5} cy={6.6} rx={3.6} ry={1} fill={C.glass} stroke={C.glassRim} strokeWidth={0.6} />
      <ellipse cx={19} cy={6.6} rx={3.6} ry={1} fill={C.glass} stroke={C.glassRim} strokeWidth={0.6} />
      <rect x={6} y={10} width={12} height={7} rx={3.5} fill={C.brass} stroke={C.outline} strokeWidth={0.8} />
      <circle cx={12} cy={13.5} r={2.2} fill={C.sky} stroke={C.brassDark} strokeWidth={0.7} />
      <path d="M12 17V19.4" stroke={C.brassDark} strokeWidth={1} />
      <Leaf x={12} y={19.6} length={3.6} angle={180} />
    </svg>
  );
}

/** Start: a glowing seed pod cradled by two leaves. */
function SeedPodIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      <circle cx={12} cy={11} r={8} fill={C.leafLight} opacity={0.3} />
      <path d="M12 3Q18 9 12 19Q6 9 12 3Z" fill={C.leaf} stroke={C.leafDark} strokeWidth={0.9} />
      <path d="M12 6Q14.4 10 12 15" stroke={C.leafLight} strokeWidth={1.2} />
      <Leaf x={12} y={19} length={7} angle={-60} color={C.fern} />
      <Leaf x={12} y={19} length={7} angle={60} color={C.fern} />
    </svg>
  );
}

/** Lobby glyphs: the HUD's smiling sprout, terrarium and wind turbine plus planter, drone and pod. */
export const SOLARPUNK_LOBBY_ICONS: Partial<Record<LobbyIconId, LobbyIconComponent>> = {
  emblem: SOLARPUNK_ICONS.emotes,
  host: SOLARPUNK_ICONS.trophy,
  emptySeat: PlanterIcon,
  addBot: DroneIcon,
  start: SeedPodIcon,
  divider: SOLARPUNK_ICONS.settings,
};
