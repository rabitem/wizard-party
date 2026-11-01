import {
  PRESENCE_TIMING,
  isRoomCode,
  isSeatProof,
  parsePresenceActivity,
  presenceForFriends,
  type FriendPresence,
  type PresenceActivity,
  type PresenceMode,
  type Relationship,
  type SocialPlayer,
} from '../../../domain/social';
import type { IClock } from '../../ports/account';
import type {
  IInboxRepository,
  IPlayerDirectory,
  IPresenceStore,
  IRoomMembershipVerifier,
  IRoomRosterStore,
  ISocialGraphRepository,
  ISocialThrottle,
  InboxSummary,
} from '../../ports/social';

export interface SocialPulseInput {
  activity?: unknown;
  idle?: unknown;
  /** The player's secret reconnect id for the room in `activity`, proving the seat to the worker. */
  seatProof?: unknown;
}

export interface SocialPulse {
  /** The viewer's chosen status, so every tab shows the same. */
  mode: PresenceMode;
  /** Presence of every friend by user id. */
  presence: Record<string, FriendPresence>;
  inbox: InboxSummary;
  /** The room the server accepted as the player's current one (null: menus or unverified). */
  roomCode: string | null;
  /** Poll again after this many ms (visible tab). */
  nextPulseMs: number;
}

export interface SocialPulseDependencies {
  graph: ISocialGraphRepository;
  directory: IPlayerDirectory;
  inbox: IInboxRepository;
  presence: IPresenceStore;
  roster: IRoomRosterStore;
  membership: IRoomMembershipVerifier;
  throttle: ISocialThrottle;
  clock: IClock;
}

/**
 * The heartbeat. One cheap call publishes the viewer's presence (and game seat), and returns the
 * friends' presence plus the inbox summary, so clients poll a single endpoint. The response shape
 * stays the same if presence later moves to push.
 *
 * A room is only accepted once the game worker attested the player's seat; until then the player
 * counts as being in the menus. Everything that trusts "the viewer is in room X" (invites, the seat
 * roster) therefore rests on the worker, not on what the browser says.
 */
export class SocialPulseUseCase {
  constructor(private readonly deps: SocialPulseDependencies) {}

  async execute(viewerId: string, input: SocialPulseInput): Promise<SocialPulse> {
    const { graph, directory, inbox, presence, roster, clock } = this.deps;
    const now = clock.now();
    const [settings, friendIds, summary, activity] = await Promise.all([
      directory.getSettings(viewerId),
      graph.friendIds(viewerId),
      inbox.summary(viewerId, now),
      this.attest(viewerId, parsePresenceActivity(input.activity), input.seatProof),
    ]);
    const heartbeat = { mode: settings.presenceMode, activity, idle: input.idle === true, at: now };
    // Invisible players are not tied to their table either.
    const seat = activity.kind !== 'menu' && settings.presenceMode !== 'invisible' ? activity.gamePlayerId : null;
    const [, , heartbeats] = await Promise.all([
      presence.publish(viewerId, heartbeat, PRESENCE_TIMING.TTL_SECONDS),
      seat && activity.kind !== 'menu' ? roster.claim(activity.roomCode, seat, viewerId, PRESENCE_TIMING.TTL_SECONDS) : undefined,
      presence.read(friendIds),
    ]);
    const friendsPresence: Record<string, FriendPresence> = {};
    for (const id of friendIds) friendsPresence[id] = presenceForFriends(heartbeats.get(id) ?? null);
    return {
      mode: settings.presenceMode,
      presence: friendsPresence,
      inbox: summary,
      roomCode: activity.kind === 'menu' ? null : activity.roomCode,
      nextPulseMs: PRESENCE_TIMING.VISIBLE_HEARTBEAT_MS,
    };
  }

  /** The activity with its worker-attested seat, or the menus when the seat can't be proven. */
  private async attest(viewerId: string, activity: PresenceActivity, seatProof: unknown): Promise<PresenceActivity> {
    if (activity.kind === 'menu') return activity;
    const { roster, membership, throttle } = this.deps;
    const cached = await roster.attestedSeat(activity.roomCode, viewerId);
    if (cached) return { ...activity, gamePlayerId: cached };
    if (!isSeatProof(seatProof) || !(await throttle.allow('seat_attestation', viewerId))) return { kind: 'menu' };
    const seat = await membership.seatOf(activity.roomCode, seatProof);
    if (!seat) return { kind: 'menu' };
    await roster.rememberAttestedSeat(activity.roomCode, viewerId, seat, PRESENCE_TIMING.SEAT_ATTESTATION_TTL_SECONDS);
    return { ...activity, gamePlayerId: seat };
  }
}

export interface RoomPlayerAccount {
  gamePlayerId: string;
  player: SocialPlayer;
  relationship: Relationship;
}

/**
 * The accounts behind the seats of the room the viewer is in, for in-game "add friend". Only
 * answers for a room the worker attested the viewer is seated in, so rosters can't be scraped.
 */
export class GetRoomAccountsUseCase {
  constructor(
    private readonly roster: IRoomRosterStore,
    private readonly directory: IPlayerDirectory
  ) {}

  async execute(viewerId: string, roomCode: unknown): Promise<RoomPlayerAccount[]> {
    if (!isRoomCode(roomCode) || !(await this.roster.attestedSeat(roomCode, viewerId))) return [];
    const seats = await this.roster.lookup(roomCode);
    const userIdBySeat = [...seats].filter(([, userId]) => userId !== viewerId);
    if (userIdBySeat.length === 0) return [];
    const players = new Map((await this.directory.findManyForViewer(viewerId, userIdBySeat.map(([, id]) => id))).map((p) => [p.userId, p]));
    return userIdBySeat.flatMap(([gamePlayerId, userId]) => {
      const found = players.get(userId);
      if (!found) return [];
      const { relationship, ...player } = found;
      return [{ gamePlayerId, player, relationship }];
    });
  }
}
