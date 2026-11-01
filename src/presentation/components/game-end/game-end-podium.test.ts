import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE, botAppearance, type CharacterAppearance } from '@shared/domain/character';

import { podiumStands } from '../podium/podium-layout';
import { gameEndContenders } from './game-end-podium';

const ownLook: CharacterAppearance = { ...DEFAULT_APPEARANCE, palette: 'palette:ember' };
const verifiedLook: CharacterAppearance = { ...DEFAULT_APPEARANCE, head: 'head:rogue' };
const accountLook: CharacterAppearance = { ...DEFAULT_APPEARANCE, head: 'head:knight' };

const human = (id: string, score: number, extra: { appearance?: CharacterAppearance } = {}) => ({ id, name: id, score, isBot: false, ...extra });
const bot = (id: string, score: number, botDifficulty: 1 | 2 | 3 | 4 | 5) => ({ id, name: id, score, isBot: true, botDifficulty });

/** Steps left to right as "place:ids", from the final scores. */
function steps(players: Parameters<typeof gameEndContenders>[0]): string[] {
  const contenders = gameEndContenders(players, 'me', ownLook, () => undefined);
  return podiumStands(contenders).map((stand) => `${stand.place}:${stand.occupants.map((occupant) => occupant.id).join(',')}`);
}

describe('gameEndContenders', () => {
  it('puts the best scores on the steps, champion in the middle', () => {
    expect(steps([human('me', 40), human('b', 120), bot('c', 90, 2), human('d', -20)])).toEqual(['2:c', '1:b', '3:me']);
  });

  it('lets co-winners share the top step, in seat order', () => {
    expect(steps([human('a', 50), human('b', 80), human('c', 80), human('d', 10)])).toEqual(['1:b,c', '3:a']);
  });

  it('fills only the steps a two-player game reaches', () => {
    expect(steps([human('a', 10), bot('b', 30, 4)])).toEqual(['2:a', '1:b']);
  });

  it('dresses each player by the table rule: own look, bot by difficulty, verified look, account look, else a silhouette', () => {
    const players = [
      human('me', 50),
      bot('bot', 40, 4),
      human('verified', 30, { appearance: verifiedLook }),
      human('known', 20),
      human('guest', 10),
    ];
    const looks = new Map(
      gameEndContenders(players, 'me', ownLook, (id) => (id === 'known' ? accountLook : undefined)).map((contender) => [contender.id, contender.appearance])
    );
    expect(looks.get('me')).toEqual(ownLook);
    expect(looks.get('bot')).toEqual(botAppearance(4));
    expect(looks.get('verified')).toEqual(verifiedLook);
    expect(looks.get('known')).toEqual(accountLook);
    expect(looks.get('guest')).toBeNull();
  });

  it('shows a guest viewer as a silhouette too', () => {
    const [viewer] = gameEndContenders([human('me', 10)], 'me', null, () => undefined);
    expect(viewer).toMatchObject({ isViewer: true, appearance: null });
  });
});
