import type { CSSProperties } from 'react';
import { SUMMER_PALETTE as C } from '@/presentation/components/hud/skins/summer/summer-palette';
import type { LobbyEmptySlotDecorProps, LobbySeatDecorProps } from '../lobby-skin.types';
import styles from './summer-lobby.module.css';

/** Towel stripe pairs, cycled per seat. */
const TOWELS: readonly (readonly [string, string])[] = [
  [C.pink, C.white],
  [C.turquoise, C.white],
  [C.yellow, C.orange],
  [C.water, C.white],
  [C.orange, C.pink],
  [C.turquoiseDark, C.yellow],
];

/** The towel (and matching deck chair canvas) colours of a seat. */
function towelOf(index: number): readonly [string, string] {
  return TOWELS[index % TOWELS.length];
}

/** A striped beach towel laid under the row, with fringes at both ends. */
export function SummerPlayerSlotDecor({ index, isLocal }: LobbySeatDecorProps) {
  const [a, b] = towelOf(index);
  const vars = { '--towel-a': a, '--towel-b': b } as CSSProperties;
  return (
    <span className="absolute inset-0 rounded-[inherit]" style={vars}>
      <span className={isLocal ? styles.towelLocal : styles.towel} />
      <span className={styles.fringeLeft} />
      <span className={styles.fringeRight} />
    </span>
  );
}

/** Wooden deck chair around the avatar: canvas back peeking above, frame at the sides, legs below. */
export function SummerAvatarFrame({ index }: LobbySeatDecorProps) {
  const [a, b] = towelOf(index);
  return (
    <svg viewBox="0 0 60 60" className={styles.deckChair}>
      <path d="M13 1H23L22 12H12Z" fill={a} />
      <path d="M23 1H33L33 12H22Z" fill={b} />
      <path d="M33 1H43L44 12H33Z" fill={a} />
      <path d="M43 1H49L50 12H44Z" fill={b} />
      <path d="M13 1H49" stroke={C.outline} strokeWidth={0.8} />
      <g stroke={C.sandDark} strokeWidth={2.6} strokeLinecap="round">
        <path d="M11 0L6 58M50 0L54 58" />
        <path d="M12 52L48 59M48 52L12 59" strokeWidth={2.2} />
      </g>
    </svg>
  );
}

/** "Reserved" sunbed: an empty deck chair with a folded towel under a parasol, flip-flops in front. */
export function SummerEmptySlotDecor({ index }: LobbyEmptySlotDecorProps) {
  const [a, b] = towelOf(index + 2);
  return (
    <>
      <span className={styles.sandBehind} />
      <svg viewBox="0 0 120 48" preserveAspectRatio="xMaxYMid meet" className={styles.emptySunbed}>
        {/* parasol */}
        <path d="M100 10L94 46" stroke={C.white} strokeWidth={1.4} />
        <path d="M76 16Q98 -2 120 6Q112 8 106 12Q98 12 92 16Q84 14 76 16Z" fill={C.pink} stroke={C.outline} strokeWidth={0.6} />
        <path d="M92 16Q98 4 106 12Q100 12 92 16Z" fill={C.white} />
        {/* deck chair, side view */}
        <path d="M40 44L60 26M52 44L44 34M70 44L62 30" stroke={C.sandDark} strokeWidth={2} strokeLinecap="round" />
        <path d="M40 30Q52 34 60 26L66 10Q58 18 46 16Z" fill={a} stroke={C.outline} strokeWidth={0.6} opacity={0.9} />
        <path d="M44 24Q54 27 62 20" stroke={b} strokeWidth={2.4} />
        {/* folded towel on the seat */}
        <rect x={42} y={26} width={14} height={4} rx={1.2} fill={b} stroke={C.outline} strokeWidth={0.5} />
        <path d="M45 26v4M49 26v4M53 26v4" stroke={a} strokeWidth={1} />
        {/* flip-flops */}
        <ellipse cx={26} cy={44} rx={5} ry={2} fill={C.turquoise} />
        <ellipse cx={18} cy={45} rx={5} ry={2} fill={C.turquoise} />
        <path d="M24 44l2-2l2 2M16 45l2-2l2 2" stroke={C.white} strokeWidth={0.8} fill="none" />
      </svg>
    </>
  );
}
