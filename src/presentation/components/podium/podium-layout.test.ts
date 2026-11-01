import { describe, expect, it } from 'vitest';

import type { RenderQualityTier } from '@/presentation/config/render-quality.config';
import type { PodiumContender } from '@/presentation/types/podium.types';

import { podiumRenderMode, podiumStands } from './podium-layout';

const contender = (id: string, rank: number): PodiumContender => ({
  id,
  rank,
  name: id,
  appearance: null,
  detail: '',
  isViewer: false,
});

/** Steps left to right as "place:ids". */
function steps(ranks: readonly (readonly [string, number])[], maxPerStep?: number): string[] {
  return podiumStands(ranks.map(([id, rank]) => contender(id, rank)), maxPerStep).map(
    (stand) => `${stand.place}:${stand.occupants.map((occupant) => occupant.id).join(',')}${stand.hidden ? `+${stand.hidden}` : ''}`
  );
}

describe('podiumStands', () => {
  it.each([
    ['three distinct ranks: champion in the middle', [['a', 1], ['b', 2], ['c', 3], ['d', 4]], ['2:b', '1:a', '3:c']],
    ['two players', [['a', 1], ['b', 2]], ['2:b', '1:a']],
    ['one player', [['a', 1]], ['1:a']],
    ['co-winners share the top step and nobody stands second', [['a', 1], ['b', 1], ['c', 3], ['d', 4]], ['1:a,b', '3:c']],
    ['a tie for second leaves the third step empty', [['a', 1], ['b', 2], ['c', 2], ['d', 4]], ['2:b,c', '1:a']],
    ['a tie for third puts both on the third step', [['a', 1], ['b', 2], ['c', 3], ['d', 3]], ['2:b', '1:a', '3:c,d']],
    ['everyone tied stands on the top step', [['a', 1], ['b', 1], ['c', 1]], ['1:a,b,c']],
  ] as const)('%s', (_name, ranks, expected) => {
    expect(steps(ranks)).toEqual(expected);
  });

  it('counts tied players beyond the step limit instead of drawing them', () => {
    expect(steps([['a', 1], ['b', 1], ['c', 1], ['d', 1], ['e', 1]], 3)).toEqual(['1:a,b,c+2']);
  });

  it('keeps the ranking order on a shared step', () => {
    expect(steps([['seat2', 1], ['seat0', 1]])).toEqual(['1:seat2,seat0']);
  });

  it('is empty without contenders', () => {
    expect(podiumStands([])).toEqual([]);
  });
});

describe('podiumRenderMode', () => {
  it.each([
    [true, 'ultra', 'figures'],
    [true, 'high', 'figures'],
    [true, 'medium', 'figures'],
    [true, 'low', 'portraits'],
    [false, 'ultra', 'portraits'],
  ] as const)('webgl %s on the %s tier shows %s', (webgl, tier: RenderQualityTier, mode) => {
    expect(podiumRenderMode(webgl, tier)).toBe(mode);
  });
});
