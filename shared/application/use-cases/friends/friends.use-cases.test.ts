import { describe, expect, it } from 'vitest';

import { SOCIAL_LIMITS } from '../../../domain/social';
import { InboxNotifier } from '../inbox/inbox-notifier';
import { RespondToFriendRequestUseCase, SendFriendRequestUseCase } from './friend-requests.use-cases';
import {
  BlockPlayerUseCase,
  GetFriendsOverviewUseCase,
  ListBlockedPlayersUseCase,
  RemoveFriendUseCase,
  SetFriendPinnedUseCase,
  UnblockPlayerUseCase,
} from './friends.use-cases';
import { SocialPulseUseCase } from './presence.use-cases';
import { MemorySocial } from './social-test-fakes';

const START = 1_000_000;

function setup() {
  let now = START;
  const clock = { now: () => now };
  const db = new MemorySocial();
  for (const id of ['alice', 'bob', 'carol', 'dave', 'erin', 'frank']) db.addPlayer(id);
  const notifier = new InboxNotifier(db, clock);
  const send = new SendFriendRequestUseCase(db, db, notifier, db, clock);
  const respond = new RespondToFriendRequestUseCase(db, notifier, clock);
  return {
    db,
    tick: (ms: number) => { now += ms; },
    now: () => now,
    send,
    befriend: async (a: string, b: string) => {
      await send.execute(a, { username: b });
      await respond.execute(b, a, true);
    },
    overview: new GetFriendsOverviewUseCase(db, db),
    pin: new SetFriendPinnedUseCase(db, clock),
    remove: new RemoveFriendUseCase(db),
    block: new BlockPlayerUseCase(db, db, notifier, clock),
    unblock: new UnblockPlayerUseCase(db),
    listBlocked: new ListBlockedPlayersUseCase(db),
    pulse: new SocialPulseUseCase({ graph: db, directory: db, inbox: db, presence: db, roster: db, membership: db, throttle: db, clock }),
  };
}

describe('friend list management', () => {
  it('should list pinned friends first, newest pin on top, then by presence and name', async () => {
    const s = setup();
    await Promise.all(['bob', 'carol', 'dave', 'erin', 'frank'].map((id) => s.befriend('alice', id)));
    await s.pin.execute('alice', 'erin', true);
    s.tick(1);
    await s.pin.execute('alice', 'frank', true);
    await s.pulse.execute('dave', { activity: { kind: 'lobby', roomCode: 'room42' }, seatProof: s.db.seat('room42', 'dave') });

    const { friends } = await s.overview.execute('alice');

    // Pins (frank pinned last), then dave in a joinable lobby, then the offline rest by name.
    expect(friends.map((friend) => friend.userId)).toEqual(['frank', 'erin', 'dave', 'bob', 'carol']);
  });

  it('should end a friendship for both players', async () => {
    const s = setup();
    await s.befriend('alice', 'bob');

    await s.remove.execute('bob', 'alice');

    expect((await s.overview.execute('alice')).friends).toEqual([]);
    expect((await s.overview.execute('bob')).friends).toEqual([]);
  });

  it('should only pin players on the friend list, and unpin them again', async () => {
    const s = setup();
    await s.befriend('alice', 'bob');

    await expect(s.pin.execute('alice', 'carol', true)).rejects.toMatchObject({ code: 'not_found' });
    await s.pin.execute('alice', 'bob', true);
    expect(s.db.friendships.get('alice->bob')?.pinnedAt).toBe(s.now());
    await s.pin.execute('alice', 'bob', false);
    expect(s.db.friendships.get('alice->bob')?.pinnedAt).toBeNull();
  });

  it('should refuse to block yourself or beyond the block list limit', async () => {
    const s = setup();
    for (let i = 0; i < SOCIAL_LIMITS.MAX_BLOCKED_PLAYERS; i += 1) s.db.blocks.add(`alice->x${i}`);

    await expect(s.block.execute('bob', 'bob')).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(s.block.execute('alice', 'bob')).rejects.toMatchObject({ code: 'limit_reached' });
    expect(s.db.blocks.has('alice->bob')).toBe(false);
  });

  it('should list blocked players until they are unblocked', async () => {
    const s = setup();
    await s.block.execute('alice', 'bob');

    expect((await s.listBlocked.execute('alice')).map((player) => player.userId)).toEqual(['bob']);
    await expect(s.send.execute('bob', { username: 'alice' })).rejects.toMatchObject({ code: 'forbidden' });

    await s.unblock.execute('alice', 'bob');

    expect(await s.listBlocked.execute('alice')).toEqual([]);
    await expect(s.send.execute('bob', { username: 'alice' })).resolves.toEqual({ outcome: 'sent' });
  });

  it.each(['', 'x'.repeat(65), 42])('should refuse %j as a player id', async (target) => {
    const s = setup();

    await expect(s.remove.execute('alice', target)).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(s.unblock.execute('alice', target)).rejects.toMatchObject({ code: 'invalid_input' });
  });
});
