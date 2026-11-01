import 'server-only';

import {
  BlockPlayerUseCase,
  CancelFriendRequestUseCase,
  ExportSocialDataUseCase,
  FindNameOwnerUseCase,
  GetFriendsOverviewUseCase,
  GetPlayerForViewerUseCase,
  GetRoomAccountsUseCase,
  GetSocialSettingsUseCase,
  ListBlockedPlayersUseCase,
  ListSentGameInvitesUseCase,
  RemoveFriendUseCase,
  RespondToFriendRequestUseCase,
  RevokeGameInviteUseCase,
  SearchPlayersUseCase,
  SearchPublicProfilesUseCase,
  SendFriendRequestUseCase,
  SendGameInviteUseCase,
  SetFriendPinnedUseCase,
  EmailNotificationGate,
  NotifyFriendRequestByEmailUseCase,
  NotifyGameInviteByEmailUseCase,
  SocialPulseUseCase,
  UnsubscribeFromEmailsUseCase,
  UnblockPlayerUseCase,
  UpdateSocialSettingsUseCase,
  friendsInboxHandlers,
} from '@shared/application/use-cases/friends';
import {
  DismissInboxItemUseCase,
  InboxNotifier,
  ListInboxUseCase,
  MarkInboxReadUseCase,
  PerformInboxActionUseCase,
  PruneSocialDataUseCase,
} from '@shared/application/use-cases/inbox';
import { tournamentInboxHandlers } from '@shared/application/use-cases/tournament';

import { after } from 'next/server';

import { SITE_URL } from '@/config/deployment.config';

import { getAccountServices } from '../account/account-container';
import { getEmailSender } from '../email/email-sender';
import { RedisUsageCounter } from '../rate-limit/redis-usage-counter';
import { getTournamentServices } from '../tournament/tournament-container';
import { EmailSocialMailer } from './email-social-mailer';
import { PartyRoomMembershipVerifier } from './party-room-membership-verifier';
import { PostgresInboxRepository } from './postgres-inbox-repository';
import { PostgresPlayerDirectory } from './postgres-player-directory';
import { PostgresSocialGraphRepository } from './postgres-social-graph-repository';
import { RedisPresenceStore } from './redis-presence-store';
import { RedisSocialThrottle } from './redis-social-throttle';

/**
 * Runs a follow-up after the response is sent (Vercel keeps the function alive), so email never
 * slows the request that caused it. Outcomes and failures are logged, never thrown.
 */
function inBackground(name: string, task: () => Promise<string>): void {
  after(() =>
    task().then(
      (outcome) => process.stdout.write(`${JSON.stringify({ level: 'info', msg: name, outcome })}\n`),
      (error: unknown) => console.error(JSON.stringify({ level: 'error', msg: `${name}_failed`, error: error instanceof Error ? error.message : String(error) }))
    )
  );
}

/** Composition root of the social context (friends, invites, presence, inbox). */
function createSocialServices() {
  const clock = { now: () => Date.now() };
  const graph = new PostgresSocialGraphRepository();
  const directory = new PostgresPlayerDirectory();
  const inbox = new PostgresInboxRepository();
  const presence = new RedisPresenceStore();
  const throttle = new RedisSocialThrottle(new RedisUsageCounter());
  const notifier = new InboxNotifier(inbox, clock);
  const respondToFriendRequest = new RespondToFriendRequestUseCase(graph, notifier, clock);
  const emailGate = new EmailNotificationGate(directory, presence, throttle);
  const mailer = new EmailSocialMailer(getEmailSender(), SITE_URL);
  const notifyInviteByEmail = new NotifyGameInviteByEmailUseCase(emailGate, mailer);
  const notifyFriendRequestByEmail = new NotifyFriendRequestByEmailUseCase(emailGate, mailer);

  return {
    pulse: new SocialPulseUseCase({
      graph,
      directory,
      inbox,
      presence,
      roster: presence,
      membership: new PartyRoomMembershipVerifier(),
      throttle,
      clock,
    }),
    roomAccounts: new GetRoomAccountsUseCase(presence, directory),
    friends: new GetFriendsOverviewUseCase(graph, presence),
    sendFriendRequest: new SendFriendRequestUseCase(graph, directory, notifier, throttle, clock, (event) =>
      inBackground('friend_request_email', () => notifyFriendRequestByEmail.execute(event))
    ),
    respondToFriendRequest,
    cancelFriendRequest: new CancelFriendRequestUseCase(graph, notifier),
    removeFriend: new RemoveFriendUseCase(graph),
    setFriendPinned: new SetFriendPinnedUseCase(graph, clock),
    blockPlayer: new BlockPlayerUseCase(graph, directory, notifier, clock),
    unblockPlayer: new UnblockPlayerUseCase(graph),
    listBlocked: new ListBlockedPlayersUseCase(graph),
    sendGameInvite: new SendGameInviteUseCase(graph, directory, presence, notifier, throttle, (event) =>
      inBackground('invite_email', () => notifyInviteByEmail.execute(event))
    ),
    listSentGameInvites: new ListSentGameInvitesUseCase(inbox, clock),
    revokeGameInvite: new RevokeGameInviteUseCase(inbox, notifier, clock),
    unsubscribeFromEmails: new UnsubscribeFromEmailsUseCase(directory, getAccountServices().ensureProfile),
    searchPlayers: new SearchPlayersUseCase(directory, throttle),
    searchPublicProfiles: new SearchPublicProfilesUseCase(directory, throttle),
    playerForViewer: new GetPlayerForViewerUseCase(directory),
    nameOwner: new FindNameOwnerUseCase(directory),
    getSettings: new GetSocialSettingsUseCase(directory),
    updateSettings: new UpdateSocialSettingsUseCase(directory, presence, getAccountServices().ensureProfile, clock),
    listInbox: new ListInboxUseCase(inbox),
    markInboxRead: new MarkInboxReadUseCase(inbox, clock),
    dismissInboxItem: new DismissInboxItemUseCase(inbox),
    // Tournament items (invite, table ready) are answered by the tournament context's own use cases.
    performInboxAction: new PerformInboxActionUseCase(
      inbox,
      { ...friendsInboxHandlers(respondToFriendRequest), ...tournamentInboxHandlers(getTournamentServices().register) },
      clock
    ),
    pruneSocialData: new PruneSocialDataUseCase(inbox, graph),
    exportSocialData: new ExportSocialDataUseCase(graph, directory, inbox),
  };
}

export type SocialServices = ReturnType<typeof createSocialServices>;

let services: SocialServices | null = null;

export function getSocialServices(): SocialServices {
  services ??= createSocialServices();
  return services;
}
