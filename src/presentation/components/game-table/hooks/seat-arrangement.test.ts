import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IPlayer } from '@shared/domain';

/** Heading of a table point seen from the centre, in [0, 2PI) */
function headingOf([x, , z]: readonly number[]): number {
  const heading = Math.atan2(z, x);
  return heading < 0 ? heading + Math.PI * 2 : heading;
}

function angleBetween(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function createPlayers(count: number): IPlayer[] {
  return Array.from({ length: count }, (_, index) => ({ id: `player-${index + 1}` }) as IPlayer);
}

/** Both seat hooks only memoise a pure layout: run them as plain functions */
async function loadSeatHooks() {
  vi.resetModules();
  vi.doMock('react', () => ({ useMemo: <T,>(factory: () => T) => factory() }));
  const [{ usePlayerPositions }, { useBrandmarkPositions }] = await Promise.all([
    import('./usePlayerPositions'),
    import('../../table/useBrandmarkPositions'),
  ]);
  return { usePlayerPositions, useBrandmarkPositions };
}

describe('seat arrangement around the table', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('react');
  });

  it.each([
    { count: 3, localIndex: 0 },
    { count: 4, localIndex: 1 },
    { count: 5, localIndex: 4 },
    { count: 6, localIndex: 2 },
  ])('seats the local player at the near side and the others in turn order ($count players, local seat $localIndex)', async ({ count, localIndex }) => {
    const { usePlayerPositions } = await loadSeatHooks();
    const players = createPlayers(count);
    const positions = usePlayerPositions({ players, localPlayerId: players[localIndex].id });
    const localHeading = headingOf(positions[localIndex].seatPos);

    // Near side: +z, the side facing the camera
    expect(angleBetween(localHeading, Math.PI / 2)).toBeLessThan(1e-9);
    for (let step = 1; step < count; step++) {
      const next = positions[(localIndex + step) % count];
      // Equal spacing around the rim, continuing in turn order
      expect(angleBetween(headingOf(next.seatPos), localHeading + (step / count) * Math.PI * 2)).toBeLessThan(1e-9);
    }
  });

  it.each([3, 4, 5, 6])('puts every seat\'s played card, deck and nameplate on one rim angle (%i players)', async (count) => {
    const { usePlayerPositions, useBrandmarkPositions } = await loadSeatHooks();
    const players = createPlayers(count);
    const localPlayerId = players[1].id;
    const positions = usePlayerPositions({ players, localPlayerId });
    const brandmarks = useBrandmarkPositions({ players, localPlayerId });

    positions.forEach((position, index) => {
      const nameplateHeading = headingOf(brandmarks[index].pos);
      for (const point of [position.seatPos, position.cardPos, position.startPos, position.handPos]) {
        expect(angleBetween(headingOf(point), nameplateHeading)).toBeLessThan(1e-9);
      }
      // Cards and the deck face their owner the way the nameplate does
      expect(angleBetween(position.rotation, brandmarks[index].rotation)).toBeLessThan(1e-9);
    });
  });
});
