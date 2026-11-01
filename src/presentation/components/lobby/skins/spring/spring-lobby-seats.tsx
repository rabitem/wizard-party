import type { CSSProperties } from 'react';
import { Blossom } from '@/presentation/components/hud/skins/spring/spring-icons';
import { SPRING_PALETTE as C } from '@/presentation/components/hud/skins/spring/spring-palette';
import type { LobbyEmptySlotDecorProps, LobbySeatDecorProps } from '../lobby-skin.types';
import styles from './spring-lobby.module.css';

/** Gingham colour of each seat's picnic blanket, cycled per seat. */
const BLANKETS = [C.blossomDark, C.leaf, C.tulipPurple, C.yellow, C.tulipRed, C.can];

/** Crown blossoms per seat as [main, accent] [colour, rim] pairs. */
const CROWNS: readonly (readonly [string, string, string, string])[] = [
  [C.blossom, C.blossomDark, C.yellow, C.yellowDark],
  [C.tulipPurple, C.tulipPurpleDark, C.blossomLight, C.blossomDark],
  [C.yellow, C.yellowDark, C.tulipRed, C.tulipRedDark],
  [C.blossomLight, C.blossomDark, C.tulipPurple, C.tulipPurpleDark],
];

/** A gingham picnic blanket under the row with a little flower-bed name plate along the bottom. */
export function SpringPlayerSlotDecor({ index, isLocal }: LobbySeatDecorProps) {
  const vars = { '--blanket': BLANKETS[index % BLANKETS.length] } as CSSProperties;
  return (
    <span className="absolute inset-0 rounded-[inherit]" style={vars}>
      <span className={isLocal ? styles.blanketLocal : styles.blanket} />
      <span className={styles.flowerBed} />
    </span>
  );
}

/** A flower crown resting on top of the avatar: a leafy band with blossoms. */
export function SpringAvatarFrame({ index }: LobbySeatDecorProps) {
  const [main, mainRim, accent, accentRim] = CROWNS[index % CROWNS.length];
  return (
    <svg viewBox="0 0 48 14" className={styles.flowerCrown}>
      <path d="M3 11Q24 1 45 11" stroke={C.leafDark} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <path d="M3 11Q24 1 45 11" stroke={C.leaf} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <path d="M8 8.6Q6 5 9 4Q10 7 8 8.6ZM40 8.6Q42 5 39 4Q38 7 40 8.6ZM20 5Q19 1.4 22 1Q22.4 4 20 5Z" fill={C.leaf} stroke={C.leafDark} strokeWidth={0.4} />
      <Blossom cx={13} cy={7.4} size={3} color={accent} rim={accentRim} />
      <Blossom cx={35} cy={7.4} size={3} color={accent} rim={accentRim} />
      <Blossom cx={24} cy={5.4} size={3.8} color={main} rim={mainRim} />
      <Blossom cx={5} cy={10.6} size={2.2} color={main} rim={mainRim} />
      <Blossom cx={43} cy={10.6} size={2.2} color={main} rim={mainRim} />
    </svg>
  );
}

/** An empty white garden chair with a watering can beside it, tulips and a seat cushion. */
export function SpringEmptySlotDecor({ index }: LobbyEmptySlotDecorProps) {
  const cushion = BLANKETS[(index + 2) % BLANKETS.length];
  return (
    <>
      <span className={styles.lawnBehind} />
      <svg viewBox="0 0 120 48" preserveAspectRatio="xMaxYMid meet" className={styles.emptyArt}>
        {/* garden chair: curly back, round seat, splayed legs */}
        <g stroke={C.white} strokeWidth={1.5} fill="none" strokeLinecap="round">
          <path d="M86 28V8Q86 4 92 4H100Q106 4 106 8V28" />
          <path d="M89 9Q93 13 89 18Q93 22 89 26M103 9Q99 13 103 18Q99 22 103 26M96 6V26" strokeWidth={0.9} />
          <path d="M82 28H110" strokeWidth={2.2} />
          <path d="M85 29L82 46M107 29L110 46M89 30L91 45M103 30L101 45" />
        </g>
        <rect x={84} y={25.4} width={24} height={3} rx={1.4} fill={cushion} opacity={0.85} />
        {/* watering can */}
        <g stroke={C.outline} strokeWidth={0.6}>
          <path d="M56 32H72L70 46H58Z" fill={C.can} />
          <path d="M72 35L80 28L81 30L73 39Z" fill={C.canDark} />
          <ellipse cx={81} cy={28.6} rx={1.6} ry={2.4} fill={C.canDark} transform="rotate(-40 81 28.6)" />
          <path d="M58 32Q64 23 70 32" fill="none" stroke={C.canDark} strokeWidth={1.8} />
        </g>
        <Blossom cx={64} cy={39} size={2.6} />
        <g className={styles.sprinkle} fill={C.water}>
          <circle cx={84} cy={30} r={0.8} />
          <circle cx={86} cy={33} r={0.7} />
          <circle cx={83} cy={34} r={0.6} />
        </g>
        {/* tulips at the chair's feet */}
        <path d="M40 47V36M46 47V34M114 47V38" stroke={C.stem} strokeWidth={1.1} />
        <path d="M37.6 36l1.2-3.4 1.2 2 1.2-2 1.2 3.4Q40 39 37.6 36Z" fill={C.tulipRed} stroke={C.outline} strokeWidth={0.4} />
        <path d="M43.6 34l1.2-3.4 1.2 2 1.2-2 1.2 3.4Q46 37 43.6 34Z" fill={C.yellow} stroke={C.outline} strokeWidth={0.4} />
        <path d="M111.6 38l1.2-3.4 1.2 2 1.2-2 1.2 3.4Q114 41 111.6 38Z" fill={C.tulipPurple} stroke={C.outline} strokeWidth={0.4} />
      </svg>
    </>
  );
}
