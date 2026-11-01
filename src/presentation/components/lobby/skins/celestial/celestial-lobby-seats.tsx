import { twinklePath } from '@/presentation/components/hud/skins/celestial/celestial-icons';
import { CELESTIAL_PALETTE as C } from '@/presentation/components/hud/skins/celestial/celestial-palette';
import type { LobbyEmptySlotDecorProps, LobbySeatDecorProps } from '../lobby-skin.types';
import { ZodiacGlyph, zodiacOf } from './celestial-lobby-icons';
import styles from './celestial-lobby.module.css';

/** A gilded diamond for the plaque corners. */
function CornerJewel({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 10 10" className={className}>
      <path d="M5 0.6L9.4 5L5 9.4L0.6 5Z" fill={C.gold} stroke={C.outline} strokeWidth={0.8} />
      <path d="M5 2.6L7.4 5L5 7.4L2.6 5Z" fill={C.midnight} />
      <circle cx={5} cy={5} r={1} fill={C.goldLight} />
    </svg>
  );
}

/**
 * A tarot-like gilded plaque: star dust on midnight, a double gold rule with jewelled corners,
 * the seat's star-sign as a faint watermark and on a small medallion at the top edge.
 */
export function CelestialPlayerSlotDecor({ index, isLocal }: LobbySeatDecorProps) {
  const sign = zodiacOf(index);
  return (
    <span className="absolute inset-0 rounded-[inherit]">
      <span className={isLocal ? styles.plaqueFillLocal : styles.plaqueFill} />
      <ZodiacGlyph d={sign} className={styles.signWatermark} />
      <span className={isLocal ? styles.plaqueRuleLocal : styles.plaqueRule} />
      <CornerJewel className={styles.jewelTopLeft} />
      <CornerJewel className={styles.jewelTopRight} />
      <CornerJewel className={styles.jewelBottomLeft} />
      <CornerJewel className={styles.jewelBottomRight} />
      <span className={styles.signMedallion}>
        <ZodiacGlyph d={sign} className={styles.signMedallionGlyph} />
      </span>
    </span>
  );
}

/** A golden zodiac ring around the avatar: ring, tick scale and a guiding star on top. */
export function CelestialAvatarFrame({ isLocal }: LobbySeatDecorProps) {
  return (
    <span className={isLocal ? styles.avatarOrbitLocal : styles.avatarOrbit}>
      <span className={styles.avatarRing} />
      <span className={styles.avatarTicks} />
      <svg viewBox="0 0 10 10" className={styles.avatarStar}>
        <path d={twinklePath(5, 5, 4.6)} fill={C.goldLight} stroke={C.outline} strokeWidth={0.5} />
      </svg>
    </span>
  );
}

/** Constellations waiting to be connected: stars as [x, y], drawn links, and the missing link. */
const CONSTELLATIONS: readonly {
  stars: readonly (readonly [number, number])[];
  drawn: string;
  missing: string;
}[] = [
  { stars: [[30, 34], [52, 18], [74, 26], [96, 12], [108, 32]], drawn: 'M30 34L52 18L74 26', missing: 'M74 26L96 12L108 32' },
  { stars: [[36, 14], [44, 36], [70, 30], [88, 40], [104, 16]], drawn: 'M36 14L44 36L70 30', missing: 'M70 30L88 40M70 30L104 16' },
  { stars: [[28, 24], [50, 10], [66, 28], [86, 20], [100, 38], [74, 40]], drawn: 'M28 24L50 10L66 28', missing: 'M66 28L86 20L100 38L74 40L66 28' },
];

/** An empty seat: a faint constellation, partly drawn, its last links dashed and pulsing. */
export function CelestialEmptySlotDecor({ index }: LobbyEmptySlotDecorProps) {
  const { stars, drawn, missing } = CONSTELLATIONS[index % CONSTELLATIONS.length];
  return (
    <>
      <span className={styles.emptyDust} />
      <svg viewBox="0 0 120 48" preserveAspectRatio="xMaxYMid meet" className={styles.constellation}>
        <path d={drawn} fill="none" stroke={C.gold} strokeWidth={0.9} opacity={0.6} />
        <path d={missing} fill="none" stroke={C.goldLight} strokeWidth={0.9} strokeDasharray="2 3" className={styles.missingLink} />
        {stars.map(([x, y], i) => (
          <path
            key={`${x}-${y}`}
            d={twinklePath(x, y, i % 2 ? 2.6 : 3.4)}
            fill={i < 3 ? C.star : C.violet}
            className={i < 3 ? undefined : styles.waitingStar}
            style={{ animationDelay: `${-i * 0.4}s` }}
          />
        ))}
      </svg>
    </>
  );
}
