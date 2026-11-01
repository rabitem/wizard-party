import { describe, expect, it } from 'vitest';

import { DEFAULT_SOCIAL_SETTINGS } from '../../../domain/social';
import { MemoryProfiles } from '../account/account-test-fakes';
import { EnsureProfileUseCase } from '../account/profile.use-cases';
import { InboxNotifier } from '../inbox/inbox-notifier';
import {
  ExportSocialDataUseCase,
  FindNameOwnerUseCase,
  GetPlayerForViewerUseCase,
  SearchPlayersUseCase,
  UpdateSocialSettingsUseCase,
} from './directory.use-cases';
import { MemorySocial } from './social-test-fakes';

const NOW = 1_000_000;
const clock = { now: () => NOW };

function social(...userIds: string[]) {
  const db = new MemorySocial();
  for (const id of userIds) db.addPlayer(id);
  return db;
}

describe('SearchPlayersUseCase', () => {
  it('should answer a query too short to search with nothing, before spending the search budget', async () => {
    const db = social('alice');
    db.denied.add('search');
    const search = new SearchPlayersUseCase(db, db);

    await expect(search.execute('alice', ' @a ')).resolves.toEqual([]);
    await expect(search.execute('alice', 42)).resolves.toEqual([]);
  });

  it('should refuse to search once the budget is spent', async () => {
    const db = social('alice');
    db.denied.add('search');

    await expect(new SearchPlayersUseCase(db, db).execute('alice', 'merlin')).rejects.toMatchObject({ code: 'rate_limited' });
  });
});

describe('GetPlayerForViewerUseCase', () => {
  it('should find a player by handle with the viewer\'s relationship', async () => {
    const db = social('alice', 'bob', 'carol');
    await db.createRequest('bob', 'alice', NOW);
    await db.acceptRequest('bob', 'alice', NOW, 100);
    const lookup = new GetPlayerForViewerUseCase(db);

    await expect(lookup.execute('alice', ' BOB ')).resolves.toMatchObject({ userId: 'bob', relationship: 'friend' });
    await expect(lookup.execute('alice', 'carol')).resolves.toMatchObject({ userId: 'carol', relationship: 'none' });
    await expect(lookup.execute('alice', 'alice')).resolves.toMatchObject({ userId: 'alice', relationship: 'self' });
  });

  it('should find nothing for unknown players or names that are no username', async () => {
    const lookup = new GetPlayerForViewerUseCase(social('alice'));

    await expect(lookup.execute('alice', 'nobody')).resolves.toBeNull();
    await expect(lookup.execute('alice', 'no body')).resolves.toBeNull();
    await expect(lookup.execute('alice', 7)).resolves.toBeNull();
  });
});

describe('FindNameOwnerUseCase', () => {
  it('should name the account behind a table name, whatever its case', async () => {
    const owners = new FindNameOwnerUseCase(social('merlin'));

    await expect(owners.execute('Merlin')).resolves.toBe('merlin');
    await expect(owners.execute('morgana')).resolves.toBeNull();
  });

  it('should not look up names that cannot be a username', async () => {
    const lookups: string[] = [];
    const owners = new FindNameOwnerUseCase({
      findByUsername: async (username) => {
        lookups.push(username);
        return null;
      },
    });

    await expect(owners.execute('Sir Merlin')).resolves.toBeNull();
    await expect(owners.execute('Merlö')).resolves.toBeNull();
    expect(lookups).toEqual([]);
  });
});

describe('UpdateSocialSettingsUseCase', () => {
  function setup() {
    const db = social('alice');
    const profiles = new MemoryProfiles();
    const update = new UpdateSocialSettingsUseCase(db, db, new EnsureProfileUseCase(profiles, clock), clock);
    return { db, profiles, update };
  }

  it('should save valid changes on the player\'s profile row', async () => {
    const { db, profiles, update } = setup();

    const settings = await update.execute({ userId: 'alice' }, { invitePolicy: 'friends', emailGameInvites: false });

    expect(settings).toMatchObject({ invitePolicy: 'friends', emailGameInvites: false });
    expect(await db.getSettings('alice')).toEqual(settings);
    expect(await profiles.get('alice')).not.toBeNull();
  });

  it('should refuse an invalid change without saving any of the others', async () => {
    const { db, update } = setup();

    await expect(update.execute({ userId: 'alice' }, { invitePolicy: 'friends', presenceMode: 'ghost' }))
      .rejects.toMatchObject({ code: 'invalid_input' });
    expect(await db.getSettings('alice')).toEqual(DEFAULT_SOCIAL_SETTINGS);
  });

  it('should publish a new online status at once, so going invisible does not wait for the next heartbeat', async () => {
    const { db, update } = setup();
    await db.publish('alice', { mode: 'online', activity: { kind: 'menu' }, idle: false, at: NOW - 30_000 });

    await update.execute({ userId: 'alice' }, { presenceMode: 'invisible' });

    expect(db.heartbeats.get('alice')).toEqual({ mode: 'invisible', activity: { kind: 'menu' }, idle: false, at: NOW });
  });

  it('should not invent a presence for a player who is offline', async () => {
    const { db, update } = setup();

    await update.execute({ userId: 'alice' }, { presenceMode: 'busy' });

    expect(db.heartbeats.has('alice')).toBe(false);
  });
});

describe('ExportSocialDataUseCase', () => {
  it('should export the player\'s whole network, settings and inbox, and nobody else\'s inbox', async () => {
    const db = social('alice', 'bob', 'carol', 'dave', 'erin', 'frank');
    await db.createRequest('bob', 'alice', NOW);
    await db.acceptRequest('bob', 'alice', NOW, 100);
    await db.createRequest('carol', 'alice', NOW);
    await db.createRequest('dave', 'alice', NOW);
    await db.declineRequest('dave', 'alice', NOW);
    await db.createRequest('alice', 'erin', NOW);
    await db.block('alice', 'frank', NOW);
    await db.updateSettings('alice', { presenceMode: 'busy' });
    const notifier = new InboxNotifier(db, clock);
    await notifier.deliver({ userId: 'alice', kind: 'game_invite', actorId: 'bob', payload: { roomCode: 'ABCD' } });
    await notifier.deliver({ userId: 'bob', kind: 'game_invite', actorId: 'alice', payload: { roomCode: 'WXYZ' } });

    const exported = await new ExportSocialDataUseCase(db, db, db).execute('alice');

    expect(exported.friends.map((edge) => edge.player.userId)).toEqual(['bob']);
    expect(exported.friendRequests.incoming.map((request) => request.player.userId)).toEqual(['carol']);
    expect(exported.friendRequests.declined.map((request) => request.player.userId)).toEqual(['dave']);
    expect(exported.friendRequests.outgoing.map((request) => request.player.userId)).toEqual(['erin']);
    expect(exported.blocked.map((player) => player.userId)).toEqual(['frank']);
    expect(exported.settings.presenceMode).toBe('busy');
    expect(exported.inbox).toEqual([expect.objectContaining({ userId: 'alice', kind: 'game_invite', payload: { roomCode: 'ABCD' } })]);
  });
});
