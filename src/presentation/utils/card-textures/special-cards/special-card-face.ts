'use client';

/**
 * Everything a style needs to compose a special card face besides its own
 * frame: title, corner index and value label (from the card catalog), the
 * colour palette, and where the emblem and value go.
 */

import { getCardCatalogEntry, type SpecialCardType } from '@shared/domain';
import type { Point } from '../styles/style-shared';
import type { EmblemFrame } from './special-card-emblems';
import { SPECIAL_CARD_PALETTES, type SpecialCardPalette } from './special-card-palettes';

export interface SpecialCardFace {
  type: SpecialCardType;
  /** Bottom title, e.g. 'DRAGON' */
  title: string;
  /** Corner index, e.g. 'D', 'Ww', '7½' */
  cornerLabel: string;
  /** Value shown large on the face for cards played as suit cards ('7½'), else null */
  valueLabel: string | null;
  palette: SpecialCardPalette;
}

/** A corner index with a digit is a value (Juggler 7½, Cloud 9¾) */
const VALUE_INDEX = /\d/;

export function getSpecialCardFace(type: SpecialCardType): SpecialCardFace {
  const entry = getCardCatalogEntry(type);
  return {
    type,
    title: entry.name.toUpperCase(),
    cornerLabel: entry.cornerLabel,
    valueLabel: VALUE_INDEX.test(entry.cornerLabel) ? entry.cornerLabel : null,
    palette: SPECIAL_CARD_PALETTES[type],
  };
}

// ============== LAYOUT ==============

/** Valued faces shrink and lift the emblem to make room for the value below it */
const VALUED_EMBLEM_SCALE = 0.76;
const VALUED_EMBLEM_LIFT = 0.38;
/** Value centre below the art centre, and its font size, relative to the art radius */
const VALUE_DROP = 1.02;
const VALUE_FONT_SCALE = 0.66;

export interface SpecialValuePlacement extends Point {
  fontSize: number;
}

export interface SpecialFaceLayout {
  emblem: EmblemFrame;
  value: SpecialValuePlacement | null;
}

/**
 * Places the emblem (and the value, if any) for art centred on `center` with
 * `radius` room around it. Styles pass their own centre and radius.
 */
export function layoutSpecialFace(center: Point, radius: number, face: SpecialCardFace): SpecialFaceLayout {
  if (!face.valueLabel) return { emblem: { ...center, size: radius }, value: null };
  return {
    emblem: { x: center.x, y: center.y - radius * VALUED_EMBLEM_LIFT, size: radius * VALUED_EMBLEM_SCALE },
    value: { x: center.x, y: center.y + radius * VALUE_DROP, fontSize: Math.round(radius * VALUE_FONT_SCALE) },
  };
}

// ============== VALUE LABELS ==============

const VULGAR_FRACTIONS: Readonly<Record<string, readonly [string, string]>> = {
  '¼': ['1', '4'],
  '½': ['1', '2'],
  '¾': ['3', '4'],
};

export interface SplitValueLabel {
  whole: string;
  /** Numerator and denominator of a trailing vulgar fraction */
  fraction: readonly [string, string] | null;
}

/** '7½' -> { whole: '7', fraction: ['1', '2'] }, for fonts without fraction glyphs */
export function splitValueLabel(label: string): SplitValueLabel {
  const last = label.slice(-1);
  const fraction = VULGAR_FRACTIONS[last] ?? null;
  return { whole: fraction ? label.slice(0, -1) : label, fraction };
}
