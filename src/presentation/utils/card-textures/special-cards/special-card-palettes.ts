'use client';

/**
 * Colour identity of every expansion special card. Each art style maps these
 * tokens onto its own idiom (neon tubes, manga spot colour, gilded tarot...),
 * so a card stays recognisable across every deck.
 *
 * All tokens are hex so styles can blend them further (blendHex).
 */

import { CardType, type SpecialCardType } from '@shared/domain';

/** Colours the emblem painters fill and outline with */
export interface EmblemPalette {
  /** Main body colour */
  primary: string;
  /** Second body colour (wings, cape, cap...) */
  secondary: string;
  /** Small bright details (eyes, sparks, stars) */
  accent: string;
  /** Outlines and darkest details */
  ink: string;
  /** Light tone (moon, skin, highlights) */
  glow: string;
}

export interface SpecialCardPalette extends EmblemPalette {
  /** Card stock at the centre of the classic / hyperreal faces */
  field: string;
  /** Card stock towards the edges */
  fieldEdge: string;
  /** Frame metal, title and corner index colour */
  metal: string;
  /** The single most characteristic colour (neon tube, manga spot colour, tarot nebula) */
  signature: string;
}

export const SPECIAL_CARD_PALETTES: Readonly<Record<SpecialCardType, SpecialCardPalette>> = {
  [CardType.DRAGON]: {
    primary: '#c0242b', secondary: '#6e1016', accent: '#ffcf3f', ink: '#1a0606', glow: '#ff9a3a',
    field: '#3a0d10', fieldEdge: '#100304', metal: '#e8b84a', signature: '#ff3b3b',
  },
  [CardType.FAIRY]: {
    primary: '#7fe0d0', secondary: '#f7a8d0', accent: '#ffe27a', ink: '#2c4a5a', glow: '#fde8f1',
    field: '#eaf8f6', fieldEdge: '#bfe6ea', metal: '#c0628f', signature: '#4ff0d8',
  },
  [CardType.BOMB]: {
    primary: '#2b2d33', secondary: '#5b5e68', accent: '#ffd24a', ink: '#0b0b0e', glow: '#ff5a1f',
    field: '#2a1a14', fieldEdge: '#0c0807', metal: '#ff8a3a', signature: '#ff6a1f',
  },
  [CardType.WEREWOLF]: {
    primary: '#3e4a5e', secondary: '#7d8aa3', accent: '#ffc83a', ink: '#0d1220', glow: '#e9eef8',
    field: '#1c2538', fieldEdge: '#070b15', metal: '#c9d4e8', signature: '#9fb6ff',
  },
  // Juggler and Cloud are played as a suit card of any suit, hence the multicolour sets
  [CardType.JUGGLER]: {
    primary: '#e63946', secondary: '#2f7de1', accent: '#ffc93c', ink: '#1d1b2c', glow: '#3cbf6a',
    field: '#fff6e6', fieldEdge: '#f0d9b5', metal: '#7a3fc8', signature: '#ffc93c',
  },
  [CardType.CLOUD]: {
    primary: '#ffffff', secondary: '#b9d4ee', accent: '#ffd84a', ink: '#3a5a80', glow: '#8fc8ff',
    field: '#d8ecff', fieldEdge: '#8fb8e6', metal: '#2f5f9e', signature: '#6fc3ff',
  },
  // Wizard purple on one side, Jester green on the other
  [CardType.SHAPESHIFTER]: {
    primary: '#6b2fb3', secondary: '#2fa35a', accent: '#ffd23f', ink: '#160d24', glow: '#c9a6ff',
    field: '#2a1446', fieldEdge: '#0b2416', metal: '#d8b4ff', signature: '#b06bff',
  },
  [CardType.VAMPIRE]: {
    primary: '#a3001b', secondary: '#151018', accent: '#ffffff', ink: '#07040a', glow: '#e8dde6',
    field: '#2b0710', fieldEdge: '#050205', metal: '#d4283c', signature: '#ff2244',
  },
  [CardType.WITCH]: {
    primary: '#5b2a86', secondary: '#2a2a33', accent: '#9bff3a', ink: '#120a1c', glow: '#c6ff6b',
    field: '#1a2a12', fieldEdge: '#08060e', metal: '#9bff3a', signature: '#9bff3a',
  },
};

/** Returns a copy of `palette` with every emblem token passed through `map` */
export function mapEmblemPalette(palette: EmblemPalette, map: (color: string, token: keyof EmblemPalette) => string): EmblemPalette {
  return {
    primary: map(palette.primary, 'primary'),
    secondary: map(palette.secondary, 'secondary'),
    accent: map(palette.accent, 'accent'),
    ink: map(palette.ink, 'ink'),
    glow: map(palette.glow, 'glow'),
  };
}
