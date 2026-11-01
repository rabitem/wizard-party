import { describe, expect, it } from 'vitest';
import { CARD_HEIGHT, CARD_THICKNESS } from '../../utils/card-texture';
import { getOwnerBadgeLabel, getPlayedCardOwnerBadgeLayout } from './played-card-owner-badge-layout';

describe('getPlayedCardOwnerBadgeLayout', () => {
  it('anchors the owner chip in card-local space just beyond the card edge, above the face', () => {
    const layout = getPlayedCardOwnerBadgeLayout();

    expect(layout.badgePosition[0]).toBe(0);
    expect(layout.badgePosition[1]).toBeGreaterThan(CARD_HEIGHT / 2);
    expect(layout.badgePosition[1]).toBeLessThanOrEqual(CARD_HEIGHT / 2 + 0.14);
    // Hovering above the card face keeps it clear of the felt without disabling depth test
    expect(layout.badgePosition[2]).toBeGreaterThan(CARD_THICKNESS / 2 + 0.02);
  });
});

describe('getOwnerBadgeLabel', () => {
  it('labels the local player YOU and shortens long names', () => {
    expect(getOwnerBadgeLabel({ name: 'Merlin' }, true)).toBe('YOU');
    expect(getOwnerBadgeLabel({ name: 'Morganafromavalon the Fay' }, false)).toBe('Morgana…');
    expect(getOwnerBadgeLabel({ name: '   ' }, false)).toBe('Player');
  });
});
