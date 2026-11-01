'use client';

import { useId } from 'react';
import type { SuitTheme } from '@/presentation/components/settings/card-theme-presets';
import { REALM_SWITCHER, type RealmOption } from './realm-switcher.config';

// SVG scene coordinates (viewBox units)
const VIEW_W = 120;
const VIEW_H = 80;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2 + 2;
const TABLE_RX = 54;
const TABLE_RY = 32;
const CARD_W = 13;
const CARD_H = 19;
const CARD_PIVOT_Y = CY + 12;

/** Suits shown on the fanned mini cards, left to right. */
const PREVIEW_SUITS = ['DWARVES', 'ELVES', 'GIANTS'] as const;

function MiniCard({ suit, angle, gradId }: { suit: SuitTheme; angle: number; gradId: string }) {
  const x = CX - CARD_W / 2;
  const y = CARD_PIVOT_Y - CARD_H;
  return (
    <g transform={`rotate(${angle} ${CX} ${CARD_PIVOT_Y + CARD_H / 2})`}>
      <rect x={x + 0.6} y={y + 1} width={CARD_W} height={CARD_H} rx={1.6} fill="#000" opacity={0.35} />
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={1.6} fill={`url(#${gradId})`} stroke={suit.gold} strokeWidth={0.7} />
      <rect x={x + 1.6} y={y + 1.6} width={CARD_W - 3.2} height={CARD_H - 3.2} rx={1} fill="none" stroke={suit.accent} strokeWidth={0.35} opacity={0.8} />
      <circle cx={CX} cy={y + CARD_H / 2} r={3} fill={suit.accent} opacity={0.9} />
      <circle cx={CX} cy={y + CARD_H / 2} r={1.3} fill={suit.gold} />
    </g>
  );
}

/** Top-down mini table with fanned cards, drawn purely from a realm's palette (no WebGL). */
export function RealmPreview({ realm }: { realm: RealmOption }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const { table, cards } = realm;
  const feltId = `${uid}-felt`;
  const woodId = `${uid}-wood`;

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-full" aria-hidden="true">
      <defs>
        <radialGradient id={feltId} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={table.felt.base} />
          <stop offset="70%" stopColor={table.felt.edge} />
          <stop offset="100%" stopColor={table.felt.center} />
        </radialGradient>
        <linearGradient id={woodId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={table.wood.base} />
          <stop offset="100%" stopColor={table.wood.apron} />
        </linearGradient>
        {PREVIEW_SUITS.map((key) => (
          <linearGradient key={key} id={`${uid}-${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cards.suits[key].secondary} />
            <stop offset="100%" stopColor={cards.suits[key].primary} />
          </linearGradient>
        ))}
      </defs>

      {/* Drop shadow + wooden rim + leather rail */}
      <ellipse cx={CX} cy={CY + 3} rx={TABLE_RX} ry={TABLE_RY} fill="#000" opacity={0.35} />
      <ellipse cx={CX} cy={CY} rx={TABLE_RX} ry={TABLE_RY} fill={`url(#${woodId})`} stroke={table.wood.molding} strokeWidth={1.2} />
      <ellipse cx={CX} cy={CY} rx={TABLE_RX - 4} ry={TABLE_RY - 4} fill={table.leather.base} />
      <ellipse cx={CX} cy={CY} rx={TABLE_RX - 6.5} ry={TABLE_RY - 6.5} fill="none" stroke={table.accent.outerRing} strokeWidth={0.8} />

      {/* Felt, stitching and the inner accent ring */}
      <ellipse cx={CX} cy={CY} rx={TABLE_RX - 8} ry={TABLE_RY - 8} fill={`url(#${feltId})`} />
      <ellipse cx={CX} cy={CY} rx={TABLE_RX - 10} ry={TABLE_RY - 10} fill="none" stroke={table.felt.stitch} strokeWidth={0.6} strokeDasharray="1.5 1.2" />
      <ellipse cx={CX} cy={CY} rx={TABLE_RX - 22} ry={TABLE_RY - 17} fill="none" stroke={table.accent.innerRing} strokeWidth={0.5} opacity={0.6} />

      {/* Fanned hand */}
      {PREVIEW_SUITS.map((key, index) => (
        <MiniCard
          key={key}
          suit={cards.suits[key]}
          angle={REALM_SWITCHER.CARD_FAN_DEGREES[index]}
          gradId={`${uid}-${key}`}
        />
      ))}
    </svg>
  );
}
