import type { CSSProperties } from 'react';
import { AUTUMN_PALETTE as C } from '@/presentation/components/hud/skins/autumn/autumn-palette';
import type { LobbyEmptySlotDecorProps, LobbySeatDecorProps } from '../lobby-skin.types';
import styles from './autumn-lobby.module.css';

/** Stencil colour of each seat's crate label, cycled per seat. */
const LABEL_INKS = [C.red, C.orange, C.gold, C.leafGreen, C.apple, C.wheat];

/** A harvest crate laid under the row: plank slats, side battens, a straw bench fringe below. */
export function AutumnPlayerSlotDecor({ index, isLocal }: LobbySeatDecorProps) {
  const vars = { '--crate-ink': LABEL_INKS[index % LABEL_INKS.length] } as CSSProperties;
  return (
    <span className="absolute inset-0 rounded-[inherit]" style={vars}>
      <span className={isLocal ? styles.crateLocal : styles.crate} />
      <span className={styles.crateStencil} />
      <span className={styles.battenLeft} />
      <span className={styles.battenRight} />
      <span className={styles.strawFringe} />
    </span>
  );
}

/** Angles (deg) of the avatar wreath leaves; colours cycle through red/orange/gold per seat. */
const WREATH_ANGLES = [0, 40, 80, 120, 160, 200, 240, 280, 320];
const WREATH_COLOURS = [C.red, C.orange, C.gold];

/** A ring of autumn leaves around the avatar, with an acorn tied at the bottom like a bow. */
export function AutumnAvatarFrame({ index }: LobbySeatDecorProps) {
  return (
    <>
      <svg viewBox="0 0 60 60" className={styles.avatarWreath}>
        {WREATH_ANGLES.map((angle, i) => (
          <g key={angle} transform={`rotate(${angle} 30 30) translate(30 6.5) rotate(65)`}>
            <path d="M0 -5Q4 -2 0 5Q-4 -2 0 -5Z" fill={WREATH_COLOURS[(i + index) % WREATH_COLOURS.length]} stroke={C.outline} strokeWidth={0.5} />
          </g>
        ))}
      </svg>
      <svg viewBox="0 0 10 12" className={styles.avatarAcorn}>
        <ellipse cx={5} cy={7.4} rx={3.4} ry={4} fill={C.acorn} stroke={C.acornDark} strokeWidth={0.6} />
        <path d="M1.2 5Q5 1.4 8.8 5Q5 6.4 1.2 5Z" fill={C.cap} stroke={C.capDark} strokeWidth={0.6} />
        <path d="M5 3V1" stroke={C.capDark} strokeWidth={0.9} strokeLinecap="round" />
      </svg>
    </>
  );
}

/** A scarecrow waiting on a hay bale for its player. */
function WaitingScarecrow() {
  return (
    <g>
      <rect x={70} y={34} width={36} height={13} rx={2} fill={C.wheat} stroke={C.wheatDark} strokeWidth={0.7} />
      <path d="M80 34V47M96 34V47" stroke={C.woodDark} strokeWidth={0.8} />
      <path d="M71 38H105M71 42H105" stroke={C.wheatDark} strokeWidth={0.5} opacity={0.7} />
      <path d="M88 34V12M76 22H100" stroke={C.woodDark} strokeWidth={2} strokeLinecap="round" />
      <path d="M77 20H99L100 25H94L95 34H81L82 25H76Z" fill={C.orange} stroke={C.outline} strokeWidth={0.5} />
      <path d="M82 20V34M88 20V34M94 20V34M77 24H99M81 30H95" stroke={C.redDark} strokeWidth={0.6} opacity={0.55} />
      <path d="M76 22l-4-2M76 22l-4 1.5M100 22l4-2M100 22l4 1.5" stroke={C.wheat} strokeWidth={1} strokeLinecap="round" />
      <circle cx={88} cy={14} r={5.4} fill={C.acornLight} stroke={C.outline} strokeWidth={0.5} />
      <path d="M85.5 13.4h1.2M89.4 13.4h1.2" stroke={C.capDark} strokeWidth={0.9} strokeLinecap="round" />
      <path d="M85.4 16Q88 18 90.6 16" stroke={C.capDark} strokeWidth={0.6} fill="none" />
      <ellipse cx={88} cy={9.4} rx={9} ry={1.8} fill={C.wheatDark} />
      <path d="M83 9.4Q83.6 3.6 88 3.2Q92.4 3.6 93 9.4Z" fill={C.wheat} stroke={C.outline} strokeWidth={0.5} />
      <path className={styles.waveHand} d="M100 22l3-5" stroke={C.wheat} strokeWidth={1.3} strokeLinecap="round" />
    </g>
  );
}

/** An empty hay bale with a pumpkin and a basket of apples saving the seat. */
function EmptyBale() {
  return (
    <g>
      <rect x={66} y={32} width={42} height={15} rx={2} fill={C.wheat} stroke={C.wheatDark} strokeWidth={0.7} />
      <path d="M78 32V47M96 32V47" stroke={C.woodDark} strokeWidth={0.8} />
      <path d="M67 36.5H107M67 41.5H107" stroke={C.wheatDark} strokeWidth={0.5} opacity={0.7} />
      <path d="M66 32l-2-3M74 32l-1-3.4M86 32l0.6-3.2M100 32l1.6-3M108 33l3-2" stroke={C.wheat} strokeWidth={0.9} strokeLinecap="round" />
      <ellipse cx={88} cy={24} rx={9} ry={7} fill={C.orange} stroke={C.orangeDark} strokeWidth={0.7} />
      <path d="M88 17V31M83.4 18Q81 24 83.4 30M92.6 18Q95 24 92.6 30" stroke={C.orangeDark} strokeWidth={0.6} fill="none" />
      <path d="M88 17Q88.6 13.4 91 12.6" stroke={C.leafGreen} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <path d="M91 13.4Q94 10.6 96.6 12.4Q93.8 15 91 13.4Z" fill={C.leafGreen} />
      {/* apple basket on the ground */}
      <circle cx={44} cy={36} r={3.2} fill={C.apple} />
      <circle cx={50} cy={35} r={3.2} fill={C.red} />
      <circle cx={56} cy={36.4} r={3} fill={C.apple} />
      <path d="M40 37H60L58 47H42Z" fill={C.wood} stroke={C.woodDark} strokeWidth={0.7} />
      <path d="M41 41H59M42.4 44.4H57.6" stroke={C.woodDark} strokeWidth={0.6} />
    </g>
  );
}

/** Empty seat: alternately a scarecrow saving it or an empty hay bale with a pumpkin. */
export function AutumnEmptySlotDecor({ index }: LobbyEmptySlotDecorProps) {
  return (
    <>
      <span className={styles.strawBehind} />
      <svg viewBox="0 0 120 48" preserveAspectRatio="xMaxYMid meet" className={styles.emptyArt}>
        <path d="M30 47Q34 41 37 47M112 47Q115 42 118 47" stroke={C.red} strokeWidth={1.4} fill="none" strokeLinecap="round" />
        <path d="M24 45l3-2 1 3M114 44l2-3 2 3" stroke={C.gold} strokeWidth={1.2} fill="none" strokeLinecap="round" />
        {index % 2 === 0 ? <WaitingScarecrow /> : <EmptyBale />}
      </svg>
    </>
  );
}
