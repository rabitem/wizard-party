import { Leaf } from '@/presentation/components/hud/skins/solarpunk/solarpunk-icons';
import { SOLARPUNK_PALETTE as C } from '@/presentation/components/hud/skins/solarpunk/solarpunk-palette';
import type { LobbyEmptySlotDecorProps, LobbySeatDecorProps } from '../lobby-skin.types';
import styles from './solarpunk-lobby.module.css';

/** Leaf colours of each seat's sprout, cycled per seat. */
const SPROUTS = [C.leaf, C.fern, C.leafLight];

/** A walnut-and-brass plaque: wood inlay, a brass inner frame, four rivets, a sprout on top. */
export function SolarpunkPlayerSlotDecor({ index, isLocal }: LobbySeatDecorProps) {
  const leaf = SPROUTS[index % SPROUTS.length];
  return (
    <>
      <span className={isLocal ? styles.plaqueLocal : styles.plaque} />
      <span className={styles.rivetsTop} />
      <span className={styles.rivetsBottom} />
      <svg viewBox="0 0 14 12" className={styles.rowSprout}>
        <path d="M7 12V5" stroke={C.leafDark} strokeWidth={1.2} strokeLinecap="round" />
        <Leaf x={7} y={8} length={5.4} angle={-58} color={leaf} />
        <Leaf x={7} y={6} length={4.6} angle={52} color={leaf} />
      </svg>
    </>
  );
}

/** A brass ring around the avatar with two leaves growing over its lower corner. */
export function SolarpunkAvatarFrame({ isLocal }: LobbySeatDecorProps) {
  return (
    <>
      <span className={isLocal ? styles.avatarRingLocal : styles.avatarRing} />
      <svg viewBox="0 0 16 14" className={styles.avatarLeaves}>
        <Leaf x={3} y={13} length={9} angle={40} />
        <Leaf x={3} y={13} length={7} angle={80} color={C.leafLight} />
      </svg>
    </>
  );
}

/** An empty brass-banded planter with a seedling, a solar garden lamp and a drip line. */
export function SolarpunkEmptySlotDecor({ index }: LobbyEmptySlotDecorProps) {
  const leaf = SPROUTS[(index + 1) % SPROUTS.length];
  return (
    <>
      <span className={styles.glassBehind} />
      <svg viewBox="0 0 120 48" preserveAspectRatio="xMaxYMid meet" className={styles.emptyArt}>
        {/* solar garden lamp */}
        <path d="M46 47V22" stroke={C.brassDark} strokeWidth={1.4} />
        <path d="M40 22H52L49 16H43Z" fill={C.panel} stroke={C.brass} strokeWidth={0.7} strokeLinejoin="round" />
        <circle className={styles.lampGlow} cx={46} cy={25} r={3} fill={C.brassLight} />
        {/* drip line from above */}
        <path d="M60 0V10Q60 12 64 12H86" stroke={C.glassRim} strokeWidth={1.2} fill="none" />
        <circle className={styles.dropFall} cx={86} cy={14} r={1.2} fill={C.sky} />
        {/* planter */}
        <path d="M68 34H104L101 47H71Z" fill={C.soil} stroke={C.outline} strokeWidth={0.6} />
        <path d="M70 38H102M70.6 42H101.4" stroke="#4e341e" strokeWidth={0.6} />
        <rect x={66} y={31.4} width={40} height={4} rx={1.2} fill={C.brass} stroke={C.brassDark} strokeWidth={0.6} />
        <circle cx={70} cy={33.4} r={0.8} fill={C.brassLight} />
        <circle cx={102} cy={33.4} r={0.8} fill={C.brassLight} />
        <circle cx={86} cy={33.4} r={0.8} fill={C.brassLight} />
        {/* seedling */}
        <g className={styles.seedling}>
          <path d="M86 32Q85 24 86 18" stroke={C.leafDark} strokeWidth={1.3} fill="none" strokeLinecap="round" />
          <Leaf x={86} y={23} length={9} angle={-60} color={leaf} />
          <Leaf x={86} y={19} length={8} angle={55} color={leaf} />
        </g>
        {/* little plant tag */}
        <path d="M96 31V24" stroke={C.cream} strokeWidth={0.8} />
        <rect x={93} y={20} width={6} height={4} rx={0.6} fill={C.cream} stroke={C.outline} strokeWidth={0.4} />
      </svg>
    </>
  );
}
