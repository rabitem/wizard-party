import { describe, expect, it } from 'vitest';
import { COLLECT_ANIMATION, TABLE_SURFACE, getCardRestY } from '../../config/physics.config';
import { getCollectingCardTargetLayout } from './stacked-deck-layout';
import {
  COLLECTION_ANIMATION_VARIANTS,
  type CollectionAnimationVariant,
} from '../../config/collection-animation.config';
import {
  COLLECTING_CARD_END_SCALE,
  getCollectingAnimationProfile,
  getCollectingFlightPathOffset,
  getCollectingFlyDelay,
  getCollectingModeTiming,
  getCollectingCardStackedY,
  getCollectingWaitDuration,
  resolveCollectingAnimationVariant,
  shortestAngleDelta,
} from './collecting-card-animation';

const DECK_REST_Y = getCardRestY(COLLECTING_CARD_END_SCALE);
const STACKED_SLOT_Y = getCollectingCardTargetLayout({
  cardId: 'fire-11',
  deckPosition: [0, 0, 0],
  deckRotation: 0,
  existingCardCount: 3,
  collectingCardCount: 3,
  collectingCardIndex: 0,
}).position[1];

describe('collecting card animation layout', () => {
  it.each([
    { target: 'a slot above an existing trick stack', y: STACKED_SLOT_Y, expected: STACKED_SLOT_Y },
    { target: 'the first deck slot at deck rest height', y: DECK_REST_Y, expected: DECK_REST_Y },
    { target: 'a malformed slot below the felt', y: TABLE_SURFACE.FELT_Y - 1, expected: DECK_REST_Y },
  ])('never lowers a deck slot and lifts targets below the felt to deck rest height ($target)', ({ y, expected }) => {
    expect(getCollectingCardStackedY([1.2, y, -0.5])).toBeCloseTo(expected);
  });
});

describe('collecting card animation variants', () => {
  it('resolves random collection animation mode deterministically across variants', () => {
    const firstPass = Array.from({ length: 16 }, (_, index) => resolveCollectingAnimationVariant({
      mode: 'random',
      cardId: `card-${index}`,
      stackIndex: index,
    }));
    const secondPass = Array.from({ length: 16 }, (_, index) => resolveCollectingAnimationVariant({
      mode: 'random',
      cardId: `card-${index}`,
      stackIndex: index,
    }));

    expect(secondPass).toEqual(firstPass);
    expect(new Set(firstPass).size).toBeGreaterThan(1);
    expect(firstPass.every((variant) => COLLECTION_ANIMATION_VARIANTS.includes(variant))).toBe(true);
    expect(resolveCollectingAnimationVariant({ mode: 'bladeDance', cardId: 'fire-11', stackIndex: 2 })).toBe('bladeDance');
  });

  it.each(COLLECTION_ANIMATION_VARIANTS)('returns no path offset at %s flight endpoints', (variant) => {
    const params = {
      variant,
      centerPosition: [0, 0.3, 0] as [number, number, number],
      targetPosition: [1.2, 0.1, -0.6] as [number, number, number],
      stackIndex: 1,
      seedAngle: 0.7,
    };

    expect(getCollectingFlightPathOffset({ ...params, t: 0 })).toEqual([0, 0, 0]);
    expect(getCollectingFlightPathOffset({ ...params, t: 1 })).toEqual([0, 0, 0]);
  });

  it('keeps classic collection path direct', () => {
    expect(getCollectingFlightPathOffset({
      variant: 'classic',
      t: 0.5,
      centerPosition: [0, 0.3, 0],
      targetPosition: [1.2, 0.1, -0.6],
      stackIndex: 2,
      seedAngle: 0.7,
    })).toEqual([0, 0, 0]);
  });

  it('does not speed up trick collection below the base phase cadence', () => {
    for (const variant of COLLECTION_ANIMATION_VARIANTS) {
      const profile = getCollectingAnimationProfile(variant);

      expect(profile.waitDurationMultiplier).toBeGreaterThanOrEqual(1);
      expect(profile.flyDurationMultiplier).toBeGreaterThanOrEqual(1);
      expect(profile.staggerMultiplier).toBeGreaterThanOrEqual(1);
    }
  });

  it('gives each non-classic variant a distinct mid-flight silhouette', () => {
    const params = {
      centerPosition: [0, 0.3, 0] as [number, number, number],
      targetPosition: [1.2, 0.1, -0.6] as [number, number, number],
      stackIndex: 2,
      seedAngle: 0.7,
    };
    const samples = Array.from({ length: 99 }, (_, index) => (index + 1) / 100);
    const peakHorizontal = (variant: CollectionAnimationVariant) => Math.max(...samples.map((t) => {
      const [x, , z] = getCollectingFlightPathOffset({ ...params, t, variant });
      return Math.hypot(x, z);
    }));
    const blade = getCollectingFlightPathOffset({ ...params, t: 0.5, variant: 'bladeDance' });
    const spiral = getCollectingFlightPathOffset({ ...params, t: 0.5, variant: 'spiral' });
    const comet = getCollectingFlightPathOffset({ ...params, t: 0.5, variant: 'comet' });

    expect(peakHorizontal('bladeDance')).toBeGreaterThan(peakHorizontal('comet') * 3);
    expect(peakHorizontal('spiral')).toBeGreaterThan(peakHorizontal('comet') * 2);
    expect(comet[1]).toBeGreaterThan(blade[1] + 0.15);
    expect(comet[1]).toBeGreaterThan(spiral[1] + 0.12);
  });

  it.each(COLLECTION_ANIMATION_VARIANTS)('moves the %s flight offset continuously, without one-frame flips', (variant) => {
    // On a fine grid a continuous path moves a few thousandths per step; a side flip moves about a unit
    const dt = 0.001;

    for (let stackIndex = 0; stackIndex < 6; stackIndex++) {
      let previous = getCollectingFlightPathOffset({
        variant, t: 0, centerPosition: [0, 0.3, 0], targetPosition: [-2.1, 0.05, 1.6], stackIndex, seedAngle: 2.3,
      });
      for (let t = dt; t <= 1 + dt; t += dt) {
        const offset = getCollectingFlightPathOffset({
          variant, t, centerPosition: [0, 0.3, 0], targetPosition: [-2.1, 0.05, 1.6], stackIndex, seedAngle: 2.3,
        });
        expect(Math.hypot(offset[0] - previous[0], offset[1] - previous[1], offset[2] - previous[2])).toBeLessThan(0.02);
        previous = offset;
      }
    }
  });

  it('sweeps the blade dance slash across the straight path instead of flipping sides', () => {
    const params = { variant: 'bladeDance' as const, centerPosition: [0, 0.3, 0] as [number, number, number], targetPosition: [2, 0.05, 0] as [number, number, number], stackIndex: 0, seedAngle: 0 };
    // Perpendicular to a flight along +X is the Z axis; the slash starts on one side and ends on the other
    const early = getCollectingFlightPathOffset({ ...params, t: 0.3 });
    const late = getCollectingFlightPathOffset({ ...params, t: 0.8 });

    expect(Math.abs(early[2])).toBeGreaterThan(0.05);
    expect(Math.sign(late[2])).toBe(-Math.sign(early[2]));
  });

  it('orbits the astral spiral exactly once per flight', () => {
    const angles = Array.from({ length: 401 }, (_, index) => {
      const [x, , z] = getCollectingFlightPathOffset({
        variant: 'spiral', t: index / 400, centerPosition: [0, 0.3, 0], targetPosition: [0, 0.05, 0], stackIndex: 1, seedAngle: 0.4,
      });
      return Math.atan2(z, x);
    });
    let turned = 0;
    for (let index = 2; index < angles.length - 1; index++) {
      turned += shortestAngleDelta(angles[index - 1], angles[index]);
    }

    expect(Math.abs(turned) / (2 * Math.PI)).toBeCloseTo(1, 1);
  });
});

describe('collecting card trick timing', () => {
  it.each(['random', ...COLLECTION_ANIMATION_VARIANTS] as const)(
    'paces %s collection for its slowest variant so every card of a trick shares one timeline',
    (mode) => {
      const timing = getCollectingModeTiming(mode);
      const variants = mode === 'random' ? COLLECTION_ANIMATION_VARIANTS : [mode];
      const profiles = variants.map((variant) => getCollectingAnimationProfile(variant));

      for (const key of ['staggerMultiplier', 'waitDurationMultiplier', 'flyDurationMultiplier'] as const) {
        // As slow as every variant that can fly in this trick, and no slower than the slowest of them
        for (const profile of profiles) expect(timing[key]).toBeGreaterThanOrEqual(profile[key]);
        expect(profiles.some((profile) => profile[key] === timing[key])).toBe(true);
      }
      expect(getCollectingWaitDuration(timing)).toBeCloseTo(COLLECT_ANIMATION.WAIT_DURATION * timing.waitDurationMultiplier);
    }
  );

  it.each(['random', ...COLLECTION_ANIMATION_VARIANTS] as const)(
    'gives each %s flight slot room for the longest flight of any card',
    (mode) => {
      const timing = getCollectingModeTiming(mode);
      const slot = getCollectingFlyDelay(1, timing) - getCollectingFlyDelay(0, timing);
      const variants = mode === 'random' ? COLLECTION_ANIMATION_VARIANTS : [mode];
      const longestFlight = Math.max(...variants.map((variant) =>
        COLLECT_ANIMATION.FLY_DURATION_MAX *
        (1 + COLLECT_ANIMATION.DURATION_JITTER) *
        getCollectingAnimationProfile(variant).flyDurationMultiplier
      ));

      expect(getCollectingFlyDelay(0, timing)).toBe(0);
      expect(slot).toBeGreaterThanOrEqual(longestFlight + COLLECT_ANIMATION.FLY_STAGGER);
      expect(getCollectingFlyDelay(4, timing)).toBeCloseTo(slot * 4);
    }
  );
});

describe('shortestAngleDelta', () => {
  it('returns the signed shortest turn', () => {
    expect(shortestAngleDelta(0, -(5 * Math.PI) / 3)).toBeCloseTo(Math.PI / 3);
    expect(shortestAngleDelta(-(5 * Math.PI) / 3, 0)).toBeCloseTo(-Math.PI / 3);
    expect(shortestAngleDelta(-0.2, 0.3)).toBeCloseTo(0.5);
    expect(Math.abs(shortestAngleDelta(0, Math.PI))).toBeCloseTo(Math.PI);
  });
});
