import type { CSSProperties } from 'react';
import type { HudButtonDecorProps, HudButtonVariant, HudPanelDecorProps } from '../hud-skin.types';
import { Blossom } from './spring-icons';
import { SPRING_PALETTE as C } from './spring-palette';
import styles from './spring.module.css';

/** Size of the corner blossom per button kind, in px. */
const CORNER_BLOSSOM: Record<HudButtonVariant, number> = { icon: 11, tile: 15, fab: 12, bid: 9 };

/** Blossom positions around the round counter wreath, in degrees (0 = right, clockwise). */
const WREATH_ANGLES = [-90, -18, 54, 126, 198];

/** A blossom (12x12 box) for the small decor spots; scales with its CSS box. */
function DecorBlossom({ className, style, light = false }: { className?: string; style?: CSSProperties; light?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" className={className} style={style}>
      <Blossom cx={6} cy={6} size={5.3} color={light ? C.blossomLight : C.blossom} />
    </svg>
  );
}

/** Soft petal rim with a tiny blossom on the top-right corner that turns on hover. */
export function SpringButtonDecor({ variant }: HudButtonDecorProps) {
  const size = CORNER_BLOSSOM[variant];
  return (
    <span className="absolute inset-0 rounded-[inherit]">
      <span className={styles.petalRim} />
      <DecorBlossom
        className="absolute top-[2px] right-[2px] transition-transform duration-700 motion-safe:group-hover:rotate-[72deg]"
        style={{ width: size, height: size }}
      />
    </span>
  );
}

/** A leaf of length ~5.6 with its base at the origin, pointing up. */
const LEAF = 'M0 0C-2.2-1.2-2.2-4 0-5.6C2.2-4 2.2-1.2 0 0Z';

function Leaf({ x, y, angle }: { x: number; y: number; angle: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path d={LEAF} fill={C.leaf} stroke={C.leafDark} strokeWidth={0.7} />
      <path d="M0-.4V-4.8" stroke={C.leafDark} strokeWidth={0.5} opacity={0.6} />
    </g>
  );
}

/** A cherry branch in bloom resting on the top edge of the standings panel. */
function BlossomBranch({ contained }: { contained: boolean }) {
  return (
    <svg viewBox="0 0 112 24" className={contained ? styles.branchContained : styles.branch}>
      <path d="M0 9C20 6 38 10 58 7S92 5 110 8" stroke={C.barkDark} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <path d="M0 9C20 6 38 10 58 7S92 5 110 8" stroke={C.bark} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <path d="M40 8.6Q44 4.6 49 4.8M76 6.4Q80 12 86 14" stroke={C.bark} strokeWidth={1.1} strokeLinecap="round" fill="none" />
      <Leaf x={31} y={8} angle={-35} />
      <Leaf x={64} y={7} angle={150} />
      <Leaf x={96} y={6.6} angle={-20} />
      <Blossom cx={20} cy={8.4} size={5} />
      <Blossom cx={49} cy={4.8} size={4.2} color={C.blossomLight} />
      <Blossom cx={58} cy={8.2} size={5} />
      <Blossom cx={86} cy={13.6} size={4.4} color={C.blossomLight} />
      <Blossom cx={104} cy={8} size={4.6} />
      <g fill={C.blossom} stroke={C.blossomDark} strokeWidth={0.7}>
        <circle cx={10} cy={6.6} r={1.6} />
        <circle cx={72} cy={4.4} r={1.4} />
        <circle cx={38} cy={12.4} r={1.3} />
      </g>
    </svg>
  );
}

/** A little vine with leaves curling around the end of the status bar. */
function CurlingVine({ contained }: { contained: boolean }) {
  return (
    <svg viewBox="0 0 20 32" className={contained ? styles.vineContained : styles.vine}>
      <g stroke={C.stem} strokeWidth={1.1} strokeLinecap="round" fill="none">
        <path d="M0 17C6 17 9 14 10 10C11 6 15 4.6 17 6.6C18.6 8.2 17.4 10.6 15.4 10.2C14 9.9 14 8.2 15.2 8" />
        <path d="M5 17C9 18 11 21 11 24C11 27 14 28.6 15.8 27.2C17 26.2 16.4 24.6 15 24.8" />
      </g>
      <Leaf x={7} y={15.4} angle={-30} />
      <Leaf x={10.8} y={21.6} angle={60} />
      <Leaf x={11.4} y={8.6} angle={-70} />
      <circle cx={4} cy={17.6} r={1.2} fill={C.blossom} stroke={C.blossomDark} strokeWidth={0.6} />
    </svg>
  );
}

/** A ladybug sitting on the edge of the bid picker. */
function Ladybug({ contained }: { contained: boolean }) {
  return (
    <svg viewBox="0 0 18 14" className={contained ? styles.ladybugContained : styles.ladybug}>
      <path d="M4.4 9.8L1.6 11.4M5.4 12L3.6 13.4M13.6 9.8L16.4 11.4M12.6 12L14.4 13.4" stroke={C.ink} strokeWidth={0.7} strokeLinecap="round" />
      <path d="M7 3.4Q6.2 1.2 4.8 .9M11 3.4Q11.8 1.2 13.2 .9" stroke={C.ink} strokeWidth={0.6} strokeLinecap="round" fill="none" />
      <ellipse cx={9} cy={4.4} rx={2.8} ry={2.1} fill={C.ink} />
      <ellipse cx={9} cy={9} rx={6} ry={4.4} fill={C.ladybug} stroke={C.ladybugDark} strokeWidth={0.7} />
      <path d="M9 4.8V13.3" stroke={C.ink} strokeWidth={0.7} />
      <g fill={C.ink}>
        <circle cx={6} cy={7.6} r={1.1} />
        <circle cx={12} cy={7.6} r={1.1} />
        <circle cx={5.8} cy={10.8} r={0.9} />
        <circle cx={12.2} cy={10.8} r={0.9} />
      </g>
      <ellipse cx={6.6} cy={6.2} rx={1.2} ry={0.6} fill="#ffffff" opacity={0.6} transform="rotate(-30 6.6 6.2)" />
    </svg>
  );
}

/** Pink petal edge on top, drifting petals behind the content, plus a per-panel ornament. */
export function SpringPanelDecor({ variant, contained }: HudPanelDecorProps) {
  return (
    <>
      <span className={styles.clipBehind}>
        <span className={styles.petals} />
      </span>
      <span className={styles.clip}>
        <span className={variant === 'status' ? styles.blossomEdgeSlim : styles.blossomEdge} />
      </span>
      {variant === 'standings' ? <BlossomBranch contained={contained} /> : null}
      {variant === 'status' ? <CurlingVine contained={contained} /> : null}
      {variant === 'picker' ? <Ladybug contained={contained} /> : null}
      {variant === 'chat' ? <DecorBlossom className={contained ? styles.chatBlossomContained : styles.chatBlossom} /> : null}
    </>
  );
}

/** Leafy wreath dotted with blossoms around the round counter (behind the text). */
export function SpringRoundBadgeDecor() {
  return (
    <>
      <span className={styles.wreath} />
      <span className={styles.wreathBlossoms}>
        {WREATH_ANGLES.map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const style = { left: `${50 + 50 * Math.cos(rad)}%`, top: `${50 + 50 * Math.sin(rad)}%` };
          return <DecorBlossom key={angle} className={styles.wreathBlossom} style={style} light={i % 2 === 1} />;
        })}
      </span>
    </>
  );
}
