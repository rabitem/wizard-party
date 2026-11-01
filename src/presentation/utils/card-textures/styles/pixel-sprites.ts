/**
 * Sprite sheets for the Pixel Arcade cards. One char per cell, '.' is
 * transparent; colours are bound per draw (see SpriteColors in pixel-canvas).
 *
 * Suit emblems use: o outline, a main, b shade, h highlight, g gold.
 */

import { Suit } from '@shared/domain';
import type { PixelSprite } from './pixel-canvas';

/** BOSS: a spiked crown with gems */
const CROWN: PixelSprite = [
  'o...o...o',
  'oo.ooo.oo',
  'oaoahaoao',
  'oaaahaaao',
  'oaaaaaaao',
  'oagaaagao',
  'obbbbbbbo',
  'ooooooooo',
];

/** GEM: a faceted diamond */
const GEM: PixelSprite = [
  '..ooooo..',
  '.ohhaabo.',
  'ohhaaabbo',
  'ooooooooo',
  'oaahaaabo',
  '.oaaaabo.',
  '..oaabo..',
  '...obo...',
  '....o....',
];

/** COIN: a round token with a slot */
const COIN: PixelSprite = [
  '..ooooo..',
  '.oaaaaao.',
  'oahabaabo',
  'oahabaabo',
  'oaaabaabo',
  'oaaabaabo',
  'oaaabaabo',
  '.obaaabo.',
  '..ooooo..',
];

/** HERO: a heart container */
const HEART: PixelSprite = [
  '.oo...oo.',
  'ohaaoaaao',
  'ohaaaaaao',
  'oaaaaaabo',
  '.oaaaabo.',
  '..oaabo..',
  '...obo...',
  '....o....',
];

export const SUIT_SPRITES: Readonly<Record<Suit, PixelSprite>> = {
  [Suit.GIANTS]: CROWN,
  [Suit.ELVES]: GEM,
  [Suit.DWARVES]: COIN,
  [Suit.HUMANS]: HEART,
};

/**
 * Wizard: o outline, h hat, s star, f face, e eye, w beard, r robe,
 * R robe shade, t staff, c crystal, b boots.
 */
export const WIZARD_SPRITE: PixelSprite = [
  '..........o.........',
  '.........oho........',
  '.........ohho.......',
  '........ohhhho......',
  '........ohshho......',
  '.......ohsssho......',
  '.......ohhshhho.....',
  'c.....ohhhhhhho.....',
  'cc....ohhhhhhhho....',
  'c....ohhhhhhhhho....',
  't..oooooooooooooooo.',
  't.ohhhhhhhhhhhhhhhho',
  't..ooooooooooooooo..',
  't....offfffffffo....',
  't....ofefffffefo....',
  't....owwfffffwwo....',
  't...owwwwwwwwwwwo...',
  'tf.orwwwwwwwwwwwro..',
  'tforrwwwwwwwwwwrrro.',
  't.orrrwwwwwwwwrrrro.',
  't.orrrrwwwwwwrrrrro.',
  't.orrrrrwwwwrrrrRo..',
  't.orrrrrrwwrrrrRRo..',
  't.orrrsrrrrrrrrRRo..',
  't.orrrrrrrrrsrrRRo..',
  't.orrrrrrrrrrrrRRo..',
  't.orrsrrrrrrrrrRRo..',
  't.oRrrrrrrrrrrrRRo..',
  't.oRRrrrrrrrrrRRRo..',
  't.ooooooooooooooo...',
  't..obbo.....obbo....',
  't..oooo.....oooo....',
];

/**
 * Jester: o outline, b bell, l/m hat halves, d diamond, w collar, f face,
 * e eye, k cheek/mouth, L/M suit halves.
 */
export const JESTER_SPRITE: PixelSprite = [
  '.b................b.',
  'obo..............obo',
  '.olo............omo.',
  '..ollo........ommo..',
  '...olllo....ommmo...',
  '....olllloommmmo....',
  '....olllllmmmmmo....',
  '....oooooooooooo....',
  '....odbdbdbdbdbo....',
  '.....offffffffo.....',
  '.....ofeffffefo.....',
  '.....okffffffko.....',
  '.....offkkkkffo.....',
  '......offffffo......',
  '...owdwdwdwdwdwo....',
  '....oLLLLLMMMMMo....',
  '...oLLdLLLMMdMMMo...',
  '..ofLLLLLLMMMMMMfo..',
  '....oLLLLLMMMMMo....',
  '....oLLdLLMMdMMo....',
  '....oLLLLLMMMMMo....',
  '....oooooooooooo....',
  '....oMMMMooLLLLo....',
  '....oMMMMooLLLLo....',
  '....oMMMMooLLLLo....',
  '....oMMMo..oLLLo....',
  '...obbbo....obbbo...',
  '..obooo......ooobo..',
  '.bo..............ob.',
];

/** 5x5 twinkle used on backgrounds */
export const SPARKLE: PixelSprite = ['..a..', '..a..', 'aahaa', '..a..', '..a..'];

/** 7x7 pixel moon */
export const MOON: PixelSprite = ['..aaa..', '.aaaab.', 'aaaab..', 'aaab...', 'aaaab..', '.aaaab.', '..aaa..'];
