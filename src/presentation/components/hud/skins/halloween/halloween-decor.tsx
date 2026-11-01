import type { HudButtonDecorProps, HudButtonVariant, HudPanelDecorProps } from '../hud-skin.types';
import { HALLOWEEN_PALETTE as C } from './halloween-palette';
import styles from './halloween.module.css';

/** Side length of the corner cobweb per button kind, in px. */
const BUTTON_WEB_SIZE: Record<HudButtonVariant, number> = { icon: 12, tile: 18, fab: 13, bid: 10 };

/** Thread arcs of a quarter cobweb anchored in its top-left corner (12x12 grid). */
const WEB_ARCS = ['M4 0Q3.2 3.2 0 4', 'M7.4 0Q6 6 0 7.4', 'M11 0Q9 9 0 11'];

/** Spokes of a quarter cobweb fanning out from its top-left corner. */
const WEB_SPOKES = ['M0 0L12 0', 'M0 0L11 5', 'M0 0L8.6 8.6', 'M0 0L5 11', 'M0 0L0 12'];

/** A quarter cobweb filling its box from the top-left corner; rotate the box for other corners. */
function CornerWeb({ className, size, opacity = 0.7 }: { className: string; size: number; opacity?: number }) {
  return (
    <svg viewBox="0 0 12 12" className={className} style={{ width: size, height: size, opacity }}>
      <g stroke={C.web} strokeWidth={0.8} fill="none" strokeLinecap="round">
        {WEB_SPOKES.map((d) => <path key={d} d={d} />)}
        {WEB_ARCS.map((d) => <path key={d} d={d} />)}
      </g>
    </svg>
  );
}

/** A cobweb tucked in the top-left corner and a faint jack-o'-lantern glow on the rim. */
export function HalloweenButtonDecor({ variant }: HudButtonDecorProps) {
  return (
    <span className="absolute inset-0 rounded-[inherit]">
      <span className={styles.lanternGlow} />
      <CornerWeb className={styles.webTopLeft} size={BUTTON_WEB_SIZE[variant]} opacity={0.55} />
    </span>
  );
}

/** A little spider hanging on a thread from the panel's top edge (gently bobbing). */
function HangingSpider({ contained }: { contained: boolean }) {
  return (
    <span className={contained ? styles.spiderHangContained : styles.spiderHang}>
      <span className={styles.thread} />
      <svg viewBox="0 0 14 12" className={styles.spider}>
        <g stroke={C.night} strokeWidth={0.9} fill="none" strokeLinecap="round">
          <path d="M5.4 5L2.6 2.4L1 4M5.2 6.2L1.6 5.8L.6 8M5.4 7.2L2.6 9L2.2 11.2" />
          <path d="M8.6 5L11.4 2.4L13 4M8.8 6.2L12.4 5.8L13.4 8M8.6 7.2L11.4 9L11.8 11.2" />
        </g>
        <ellipse cx={7} cy={7.4} rx={2.6} ry={3} fill={C.night} stroke={C.purple} strokeWidth={0.6} />
        <circle cx={7} cy={3.6} r={1.6} fill={C.night} />
        <circle cx={6.4} cy={3.4} r={0.4} fill={C.flame} />
        <circle cx={7.6} cy={3.4} r={0.4} fill={C.flame} />
      </svg>
    </span>
  );
}

/** A small glowing jack-o'-lantern perched on the bid picker. */
function PerchedLantern({ contained }: { contained: boolean }) {
  return (
    <svg viewBox="0 0 22 20" className={contained ? styles.lanternContained : styles.lantern}>
      <path d="M11 5.6Q10.6 2.8 12.8 1.6" stroke={C.stemDark} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <path d="M11 5.6Q10.6 2.8 12.8 1.6" stroke={C.stem} strokeWidth={0.9} strokeLinecap="round" fill="none" />
      <ellipse cx={11} cy={12.2} rx={9.6} ry={7} fill={C.pumpkin} stroke={C.pumpkinDark} strokeWidth={0.8} />
      <ellipse cx={11} cy={12.2} rx={4.8} ry={7} fill="none" stroke={C.pumpkinDark} strokeWidth={0.8} opacity={0.7} />
      <path d="M6 10.6L7.8 8L9.4 10.6ZM12.6 10.6L14.2 8L16 10.6Z" fill={C.glow} />
      <path d="M5.4 13Q11 17.6 16.6 13Q15 17.2 11 17.4Q7 17.2 5.4 13Z" fill={C.glow} />
      <path d="M8.6 13.8h1.4v1.3H8.6ZM12 13.8h1.4v1.3H12Z" fill={C.pumpkin} />
    </svg>
  );
}

/** Cobwebs in the corners, bats drifting behind the content and a per-panel ornament. */
export function HalloweenPanelDecor({ variant, contained }: HudPanelDecorProps) {
  const webSize = variant === 'status' ? 14 : 22;
  return (
    <>
      <span className={styles.clipBehind}>
        <span className={styles.bats} />
      </span>
      <span className={styles.clip}>
        {variant === 'status' ? <span className={styles.waxDrips} /> : <span className={styles.edgeGlow} />}
        <CornerWeb className={styles.webTopLeft} size={webSize} />
        <CornerWeb className={styles.webTopRight} size={webSize} />
        {variant !== 'status' ? <CornerWeb className={styles.webBottomRight} size={webSize - 4} opacity={0.5} /> : null}
      </span>
      {variant === 'standings' ? <HangingSpider contained={contained} /> : null}
      {variant === 'picker' ? <PerchedLantern contained={contained} /> : null}
    </>
  );
}

/** A carved jack-o'-lantern glowing behind the round counter. */
export function HalloweenRoundBadgeDecor() {
  return (
    <svg viewBox="0 0 40 26" preserveAspectRatio="none" className={styles.roundPumpkin}>
      <path d="M20 4.6Q19.6 1.8 22.4 1" stroke={C.stem} strokeWidth={2} strokeLinecap="round" fill="none" />
      <ellipse cx={20} cy={14.6} rx={19} ry={10.6} fill={C.pumpkin} stroke={C.pumpkinDark} strokeWidth={1} />
      <ellipse cx={20} cy={14.6} rx={11} ry={10.6} fill="none" stroke={C.pumpkinDark} strokeWidth={0.9} opacity={0.6} />
      <ellipse cx={20} cy={14.6} rx={4} ry={10.6} fill="none" stroke={C.pumpkinDark} strokeWidth={0.9} opacity={0.5} />
      <ellipse cx={20} cy={15} rx={13} ry={6.4} fill={C.glow} opacity={0.35} />
    </svg>
  );
}
