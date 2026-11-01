import type { CSSProperties } from 'react';
import { MANGA_PALETTE as C } from '@/presentation/components/hud/skins/manga/manga-palette';
import type { LobbyEmptySlotDecorProps, LobbySeatDecorProps } from '../lobby-skin.types';
import styles from './manga-lobby.module.css';

/** Halftone colours of the avatar bursts, cycled per seat. */
const TONES = [C.red, C.yellow, C.sweat, C.blush, C.bamboo, C.paperShade];

/** Character-intro epithets for seats that are neither you, the host nor a bot. */
const EPITHETS = ['The Challenger', 'The Wanderer', 'The Prodigy', 'The Rookie', 'The Drifter', 'The Ace'];

/** The caption of a seat's character-intro box, e.g. "Ch.2 - The Sensei". */
function captionOf({ index, isLocal, isHost, isBot }: LobbySeatDecorProps): string {
  let epithet = EPITHETS[index % EPITHETS.length];
  if (isBot) epithet = 'The Rival';
  if (isHost) epithet = 'The Sensei';
  if (isLocal) epithet = 'The Hero';
  return `Ch.${index + 1} - ${epithet}`;
}

/**
 * A comic burst as a CSS polygon (percent coordinates), so the halftone can be a plain CSS
 * background clipped to it (no SVG pattern ids).
 */
function burstPolygon(spikes: number, inner: number): string {
  const points: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? 50 : 50 * inner;
    const angle = (Math.PI * i) / spikes - Math.PI / 2;
    points.push(`${(50 + radius * Math.cos(angle)).toFixed(1)}% ${(50 + radius * Math.sin(angle)).toFixed(1)}%`);
  }
  return `polygon(${points.join(',')})`;
}

const AVATAR_BURST = burstPolygon(14, 0.74);

/** A manga panel: screentone fill, bold ink border with a paper gutter, and a caption box. */
export function MangaPlayerSlotDecor(props: LobbySeatDecorProps) {
  const { isLocal } = props;
  return (
    <span className="absolute inset-0 rounded-[inherit]">
      <span className={isLocal ? styles.panelToneLocal : styles.panelTone} />
      <span className={isLocal ? styles.panelFrameLocal : styles.panelFrame} />
      <span className={isLocal ? styles.captionLocal : styles.caption}>{captionOf(props)}</span>
    </span>
  );
}

/** A halftone comic burst flaring behind the avatar, with a paper rim. */
export function MangaAvatarFrame({ index, isLocal }: LobbySeatDecorProps) {
  const vars = { '--tone': TONES[index % TONES.length], clipPath: AVATAR_BURST } as CSSProperties;
  return (
    <span className={isLocal ? styles.avatarBurstLocal : styles.avatarBurst}>
      <span className={styles.avatarBurstRim} style={{ clipPath: AVATAR_BURST }} />
      <span className={styles.avatarBurstTone} style={vars} />
    </span>
  );
}

/** An empty panel: faint screentone and a "..." thought bubble drifting at the right. */
export function MangaEmptySlotDecor({ index }: LobbyEmptySlotDecorProps) {
  const flip = index % 2 === 1;
  return (
    <>
      <span className={styles.emptyTone} />
      <svg viewBox="0 0 120 48" preserveAspectRatio="xMaxYMid meet" className={styles.thought}>
        <g transform={flip ? 'translate(120 0) scale(-1 1)' : undefined}>
          <circle cx={38} cy={40} r={2.4} fill={C.paper} stroke={C.ink} strokeWidth={1} />
          <circle cx={47} cy={34} r={3.6} fill={C.paper} stroke={C.ink} strokeWidth={1} />
          <path
            d="M60 30Q52 30 53 23Q52 15 61 15Q63 7 73 8Q80 3 89 8Q99 6 102 14Q111 16 109 24Q111 32 101 32Q97 38 87 35Q80 40 72 35Q63 37 60 30Z"
            fill={C.paper}
            stroke={C.ink}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
          <g fill={C.ink}>
            <circle className={flip ? styles.dot3 : styles.dot1} cx={70} cy={23} r={2.4} />
            <circle className={styles.dot2} cx={81} cy={23} r={2.4} />
            <circle className={flip ? styles.dot1 : styles.dot3} cx={92} cy={23} r={2.4} />
          </g>
        </g>
      </svg>
    </>
  );
}
