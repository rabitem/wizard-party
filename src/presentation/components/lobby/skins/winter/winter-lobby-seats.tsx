import { WINTER_PALETTE as C } from '@/presentation/components/hud/skins/winter/winter-palette';
import type { LobbySeatDecorProps } from '../lobby-skin.types';
import styles from './winter-lobby.module.css';

/** Bumpy snow drift path on a 100x10 box (stretched to the host width). */
const SNOW_CAP_PATH =
  'M0 9Q0 4 5 4Q8 1 14 3Q20 0 27 3Q33 1 40 3Q47 0 54 3Q61 1 68 3Q75 0 82 3Q89 1 95 4Q100 4 100 9Q94 7 88 9Q80 6 72 9Q64 7 56 9Q48 6 40 9Q32 7 24 9Q16 6 8 9Q4 7 0 9Z';

/** A snow drift lying along the top edge of its box. */
function SnowCap({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 100 10" preserveAspectRatio="none" className={className}>
      <path d={SNOW_CAP_PATH} fill={C.snow} />
      <path d="M4 6Q30 3 50 5Q72 3 96 6" stroke={C.snowShade} strokeWidth={0.6} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A wooden sled seat: plank sign with a snow cap, two nails and a curled runner underneath. */
export function WinterPlayerSlotDecor({ isLocal }: LobbySeatDecorProps) {
  return (
    <>
      <span className={isLocal ? styles.planksLocal : styles.planks} />
      <SnowCap className={styles.rowSnow} />
      <span className={styles.nailLeft} />
      <span className={styles.nailRight} />
      <svg viewBox="0 0 100 8" preserveAspectRatio="none" className={styles.runner}>
        <path d="M0 3H92Q99 3 99 0" stroke={isLocal ? C.red : C.silver} strokeWidth={1.6} fill="none" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        <path d="M14 0V3M50 0V3M84 0V3" stroke={C.woodDark} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
      </svg>
    </>
  );
}

/** A little snow cap settled on top of the avatar box. */
export function WinterAvatarFrame() {
  return <SnowCap className={styles.avatarSnow} />;
}

/** A snowman keeping the seat warm, a scarf blowing in the wind. */
export function WinterEmptySlotDecor() {
  return (
    <>
      <span className={styles.frostBehind} />
      <svg viewBox="0 0 120 48" preserveAspectRatio="xMaxYMid meet" className={styles.snowman}>
        <ellipse cx={92} cy={46} rx={24} ry={3} fill={C.snow} opacity={0.6} />
        <circle cx={92} cy={36} r={10} fill={C.snow} stroke={C.snowShade} strokeWidth={1} />
        <circle cx={92} cy={20} r={7.5} fill={C.snow} stroke={C.snowShade} strokeWidth={1} />
        <circle cx={92} cy={33} r={1} fill={C.coal} />
        <circle cx={92} cy={38} r={1} fill={C.coal} />
        <circle cx={89.5} cy={18.5} r={0.9} fill={C.coal} />
        <circle cx={94.5} cy={18.5} r={0.9} fill={C.coal} />
        <path d="M92 20.5L98 22L92 22.4Z" fill={C.carrot} />
        <path d="M86 25.5Q92 28 98 25.5" stroke={C.red} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        <path className={styles.scarf} d="M96 26L104 30L101 32L95 28Z" fill={C.red} />
        <rect x={86} y={9} width={12} height={4} rx={0.8} fill={C.coal} />
        <rect x={88} y={2} width={8} height={8} rx={0.8} fill={C.coal} />
        <path d="M82 32L72 24M72 24L70 21M72 24L69 25M102 32L111 26" stroke={C.woodDark} strokeWidth={1.2} strokeLinecap="round" />
        <circle cx={60} cy={44} r={3.5} fill={C.snow} stroke={C.snowShade} strokeWidth={0.8} />
        <circle cx={52} cy={45} r={2.5} fill={C.snow} stroke={C.snowShade} strokeWidth={0.8} />
      </svg>
    </>
  );
}
