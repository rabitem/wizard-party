'use client';

import { motion } from 'motion/react';
import type { RealmGlyph } from './realm-switcher.config';

const WAVE_KEYFRAMES = [0, -35, 5, -35, 0];
const WAVE_TRANSITION = { duration: 1.4, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' } as const;
const LEAF_WAVE_DELAY_S = 1.6;
const FACE_COLOR = '#2a1408';

interface MascotProps {
  animate: boolean;
  className?: string;
}

function Face({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g fill={FACE_COLOR}>
      <circle cx={cx - 6} cy={cy - 3} r={2.4} />
      <circle cx={cx + 6} cy={cy - 3} r={2.4} />
      <path d={`M${cx - 6} ${cy + 4} Q${cx} ${cy + 10} ${cx + 6} ${cy + 4}`} stroke={FACE_COLOR} strokeWidth={2} fill="none" strokeLinecap="round" />
    </g>
  );
}

function WavingArm({ x, y, color, animate, delay = 0 }: { x: number; y: number; color: string; animate: boolean; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Arm's bounding box starts at the shoulder (bottom-left), so rotate around it */}
      <motion.g
        style={{ originX: 0, originY: 1 }}
        animate={animate ? { rotate: WAVE_KEYFRAMES } : undefined}
        transition={{ ...WAVE_TRANSITION, delay }}
      >
        <path d="M0 0 Q7 -6 9 -15" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />
        <circle cx={9} cy={-17} r={3.2} fill={color} />
      </motion.g>
    </g>
  );
}

/** Waving jack-o'-lantern, the Halloween realm's charm. */
export function PumpkinMascot({ animate, className = 'w-12 h-12' }: MascotProps) {
  return (
    <svg viewBox="0 0 64 64" className={`${className} overflow-visible`} aria-hidden="true">
      <path d="M31 14 Q30 7 35 5" stroke="#4d7a2a" strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <ellipse cx="22" cy="37" rx="13" ry="16" fill="#e8650f" />
      <ellipse cx="42" cy="37" rx="13" ry="16" fill="#e8650f" />
      <ellipse cx="32" cy="37" rx="12" ry="17" fill="#ff8a1f" />
      <Face cx={32} cy={38} />
      <WavingArm x={54} y={36} color="#e8650f" animate={animate} />
    </svg>
  );
}

/** Waving maple leaf, the Autumn realm's charm. */
export function LeafMascot({ animate, className = 'w-12 h-12' }: MascotProps) {
  return (
    <svg viewBox="0 0 64 64" className={`${className} overflow-visible`} aria-hidden="true">
      <path d="M32 56 L32 62" stroke="#7a3e1d" strokeWidth={3} strokeLinecap="round" />
      <path
        d="M32 56 C14 52 6 36 12 20 C20 24 24 18 32 6 C40 18 44 24 52 20 C58 36 50 52 32 56 Z"
        fill="#d9752b"
      />
      <path d="M32 54 L32 18" stroke="#a8511c" strokeWidth={1.5} opacity={0.6} />
      <Face cx={32} cy={36} />
      <WavingArm x={51} y={36} color="#c4621f" animate={animate} delay={LEAF_WAVE_DELAY_S} />
    </svg>
  );
}

/** 7x6 pixel heart rows (1 = filled), the Pixel Arcade realm's charm. */
const PIXEL_HEART_ROWS = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
const PIXEL_HEART_CELLS = PIXEL_HEART_ROWS.flatMap((row, y) =>
  [...row].flatMap((bit, x) => (bit === '1' ? [{ id: `${x}-${y}`, x, y }] : []))
);

function PixelHeart({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="-0.5 -0.5 8 7" className={`${className} drop-shadow`} shapeRendering="crispEdges" aria-hidden="true">
      {PIXEL_HEART_CELLS.map((cell) => (
        <rect key={cell.id} x={cell.x} y={cell.y} width={1} height={1} fill="#ff4d6d" />
      ))}
      <rect x={1} y={1} width={1} height={1} fill="#ffd6dc" />
    </svg>
  );
}

/** Renders a realm's glyph: an animated mascot, the pixel heart or a line icon. */
export function RealmGlyphIcon({ glyph, animate }: { glyph: RealmGlyph; animate: boolean }) {
  if (glyph.kind === 'pixel-heart') return <PixelHeart />;
  if (glyph.kind === 'icon') {
    const Icon = glyph.icon;
    return <Icon className="w-5 h-5 text-amber-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" strokeWidth={1.75} aria-hidden="true" />;
  }
  const Mascot = glyph.mascot === 'pumpkin' ? PumpkinMascot : LeafMascot;
  return <Mascot animate={animate} className="w-7 h-7" />;
}
