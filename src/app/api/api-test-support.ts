/*
 * Route handler tests: the production use cases wired, like the composition roots
 * (account-container.ts, social-container.ts, tournament-container.ts), onto the in-memory adapters
 * of the use case tests. A route test then sees what a request persists and what it answers,
 * without Postgres, Redis, Blob or email. Test-only: imported by *.test.ts files under src/app/api.
 */
import {
  DeleteCustomSoundUseCase,
  EnsureProfileUseCase,
  ExportAccountDataUseCase,
  GetAccountOverviewUseCase,
  GetCharacterUseCase,
  GetCommunityStatsUseCase,
  GetLeaderboardsUseCase,
  GetPublicProfileUseCase,
  ImportGuestProgressUseCase,
  ListAccountDocumentsUseCase,
  ListCustomSoundsUseCase,
  ListGameHistoryUseCase,
  PinGameUseCase,
  PlayerProgressRefresher,
  ProgressCalculator,
  PurgeAccountStorageUseCase,
  RecordGameResultsUseCase,
  SaveAccountDocumentUseCase,
  SaveCharacterUseCase,
  UnpinGameUseCase,
  UpdateCustomSoundUseCase,
  UpdateProfileUseCase,
  UploadCustomSoundUseCase,
} from '@shared/application/use-cases/account';
import { MemoryCharacters, MemoryGameResults, MemoryProfiles, MemoryProgress } from '@shared/application/use-cases/account/account-test-fakes';
import {
  BlockPlayerUseCase,
  CancelFriendRequestUseCase,
  EmailNotificationGate,
  ExportSocialDataUseCase,
  FindNameOwnerUseCase,
  GetFriendsOverviewUseCase,
  GetPlayerForViewerUseCase,
  GetRoomAccountsUseCase,
  GetSocialSettingsUseCase,
  ListBlockedPlayersUseCase,
  ListSentGameInvitesUseCase,
  NotifyFriendRequestByEmailUseCase,
  NotifyGameInviteByEmailUseCase,
  RemoveFriendUseCase,
  RespondToFriendRequestUseCase,
  RevokeGameInviteUseCase,
  SearchPlayersUseCase,
  SendFriendRequestUseCase,
  SendGameInviteUseCase,
  SetFriendPinnedUseCase,
  SocialPulseUseCase,
  UnblockPlayerUseCase,
  UnsubscribeFromEmailsUseCase,
  UpdateSocialSettingsUseCase,
  friendsInboxHandlers,
  type FriendRequestSent,
  type GameInviteSent,
} from '@shared/application/use-cases/friends';
import { MemorySocial } from '@shared/application/use-cases/friends/social-test-fakes';
import {
  DismissInboxItemUseCase,
  InboxNotifier,
  ListInboxUseCase,
  MarkInboxReadUseCase,
  PerformInboxActionUseCase,
  PruneSocialDataUseCase,
} from '@shared/application/use-cases/inbox';
import {
  CancelTournamentUseCase,
  CreateTournamentUseCase,
  ExportTournamentDataUseCase,
  GetTournamentUseCase,
  GetTrophyCabinetUseCase,
  InviteToTournamentUseCase,
  IssueMatchTicketUseCase,
  ListMyTournamentsUseCase,
  ListTournamentsUseCase,
  PurgeTournamentDataUseCase,
  RecordMatchProgressUseCase,
  RecordMatchResultUseCase,
  RegisterForTournamentUseCase,
  ResolveStaleMatchUseCase,
  StartTournamentUseCase,
  TournamentEffects,
  TournamentStore,
  UpdateTournamentUseCase,
  WithdrawFromTournamentUseCase,
  tournamentInboxHandlers,
} from '@shared/application/use-cases/tournament';
import {
  FakeProgressRefresher,
  FakeTournamentThrottle,
  HmacTicketSigner,
  MemoryTournamentRepository,
  SequentialTournamentIds,
} from '@shared/application/use-cases/tournament/tournament-test-fakes';

import type { AccountServices } from '@/infrastructure/account/account-container';
import type { SessionUser } from '@/infrastructure/auth/auth';
import type { SocialServices } from '@/infrastructure/social/social-container';
import type { TournamentServices } from '@/infrastructure/tournament/tournament-container';

import { MemoryBlobs, MemoryDocuments, MemorySounds, StubReadModels } from './account-test-adapters';

/** Fixed start of every route test's clock. */
export const T0 = 1_800_000_000_000;
export const APP_ORIGIN = 'https://wizardparty.fun';
export const TICKET_SECRET = 'route-test-tournament-secret';

function createAccount(clock: { now(): number }, tournamentRepo: MemoryTournamentRepository, readModels: StubReadModels) {
  const results = new MemoryGameResults();
  const progress = new MemoryProgress(clock);
  const profiles = new MemoryProfiles();
  const documents = new MemoryDocuments(clock);
  const sounds = new MemorySounds();
  const blobs = new MemoryBlobs();
  const characters = new MemoryCharacters();
  const calculator = new ProgressCalculator(results, progress, tournamentRepo, clock);
  const ensureProfile = new EnsureProfileUseCase(profiles, clock);
  const services: AccountServices = {
    ensureProfile,
    getOverview: new GetAccountOverviewUseCase(ensureProfile, calculator, results),
    updateProfile: new UpdateProfileUseCase(ensureProfile, profiles),
    recordGameResults: new RecordGameResultsUseCase(results, calculator, clock),
    listGameHistory: new ListGameHistoryUseCase(results),
    pinGame: new PinGameUseCase(results, clock),
    unpinGame: new UnpinGameUseCase(results),
    getPublicProfile: new GetPublicProfileUseCase(readModels),
    getLeaderboards: new GetLeaderboardsUseCase(readModels),
    getCommunityStats: new GetCommunityStatsUseCase(readModels),
    importGuestProgress: new ImportGuestProgressUseCase(results, progress, calculator, clock),
    listDocuments: new ListAccountDocumentsUseCase(documents),
    saveDocument: new SaveAccountDocumentUseCase(documents),
    getCharacter: new GetCharacterUseCase(characters, documents, calculator),
    saveCharacter: new SaveCharacterUseCase(ensureProfile, characters, calculator),
    listCustomSounds: new ListCustomSoundsUseCase(sounds),
    uploadCustomSound: new UploadCustomSoundUseCase(sounds, blobs, clock),
    updateCustomSound: new UpdateCustomSoundUseCase(sounds),
    deleteCustomSound: new DeleteCustomSoundUseCase(sounds, blobs),
    exportAccountData: new ExportAccountDataUseCase({ profiles, results, progress, documents, sounds, characters }),
    purgeAccountStorage: new PurgeAccountStorageUseCase(sounds, blobs),
    progressRefresher: new PlayerProgressRefresher(calculator),
  };
  return { services, results, progress, profiles, documents, sounds, blobs, characters };
}

function createTournaments(clock: { now(): number }, repo: MemoryTournamentRepository, db: MemorySocial) {
  const throttle = new FakeTournamentThrottle();
  const ids = new SequentialTournamentIds();
  const progress = new FakeProgressRefresher();
  const effectErrors: string[] = [];
  // Tournament items land in the same inbox as the social ones, as in production.
  const inbox = new InboxNotifier(db, clock);
  const store = new TournamentStore(repo, new TournamentEffects(inbox, progress, (effect) => effectErrors.push(effect)), clock);
  const services: TournamentServices = {
    create: new CreateTournamentUseCase(repo, store, db, throttle, ids, clock),
    update: new UpdateTournamentUseCase(store, ids),
    start: new StartTournamentUseCase(store),
    cancel: new CancelTournamentUseCase(store),
    resolveStaleMatch: new ResolveStaleMatchUseCase(store),
    register: new RegisterForTournamentUseCase(store, db, throttle),
    withdraw: new WithdrawFromTournamentUseCase(store),
    invite: new InviteToTournamentUseCase(store, db, db, inbox, throttle),
    get: new GetTournamentUseCase(store),
    list: new ListTournamentsUseCase(repo, store, clock),
    listMine: new ListMyTournamentsUseCase(repo, repo),
    trophyCabinet: new GetTrophyCabinetUseCase(repo),
    issueTicket: new IssueMatchTicketUseCase(store, new HmacTicketSigner(TICKET_SECRET), throttle),
    recordMatchResult: new RecordMatchResultUseCase(store),
    recordMatchProgress: new RecordMatchProgressUseCase(store),
    exportData: new ExportTournamentDataUseCase(repo, repo),
    purgeData: new PurgeTournamentDataUseCase(repo, store),
  };
  return { services, throttle, effectErrors };
}

function createSocial(clock: { now(): number }, db: MemorySocial, account: AccountServices, tournaments: TournamentServices) {
  const notifier = new InboxNotifier(db, clock);
  const respondToFriendRequest = new RespondToFriendRequestUseCase(db, notifier, clock);
  const gate = new EmailNotificationGate(db, db, db);
  const friendRequestEmails = new NotifyFriendRequestByEmailUseCase(gate, db);
  const inviteEmails = new NotifyGameInviteByEmailUseCase(gate, db);
  const friendRequestsSent: FriendRequestSent[] = [];
  const invitesSent: GameInviteSent[] = [];
  const services: SocialServices = {
    pulse: new SocialPulseUseCase({ graph: db, directory: db, inbox: db, presence: db, roster: db, membership: db, throttle: db, clock }),
    roomAccounts: new GetRoomAccountsUseCase(db, db),
    friends: new GetFriendsOverviewUseCase(db, db),
    sendFriendRequest: new SendFriendRequestUseCase(db, db, notifier, db, clock, (event) => {
      friendRequestsSent.push(event);
      void friendRequestEmails.execute(event);
    }),
    respondToFriendRequest,
    cancelFriendRequest: new CancelFriendRequestUseCase(db, notifier),
    removeFriend: new RemoveFriendUseCase(db),
    setFriendPinned: new SetFriendPinnedUseCase(db, clock),
    blockPlayer: new BlockPlayerUseCase(db, db, notifier, clock),
    unblockPlayer: new UnblockPlayerUseCase(db),
    listBlocked: new ListBlockedPlayersUseCase(db),
    sendGameInvite: new SendGameInviteUseCase(db, db, db, notifier, db, (event) => {
      invitesSent.push(event);
      void inviteEmails.execute(event);
    }),
    listSentGameInvites: new ListSentGameInvitesUseCase(db, clock),
    revokeGameInvite: new RevokeGameInviteUseCase(db, notifier, clock),
    unsubscribeFromEmails: new UnsubscribeFromEmailsUseCase(db, account.ensureProfile),
    searchPlayers: new SearchPlayersUseCase(db, db),
    playerForViewer: new GetPlayerForViewerUseCase(db),
    nameOwner: new FindNameOwnerUseCase(db),
    getSettings: new GetSocialSettingsUseCase(db),
    updateSettings: new UpdateSocialSettingsUseCase(db, db, account.ensureProfile, clock),
    listInbox: new ListInboxUseCase(db),
    markInboxRead: new MarkInboxReadUseCase(db, clock),
    dismissInboxItem: new DismissInboxItemUseCase(db),
    performInboxAction: new PerformInboxActionUseCase(db, { ...friendsInboxHandlers(respondToFriendRequest), ...tournamentInboxHandlers(tournaments.register) }, clock),
    pruneSocialData: new PruneSocialDataUseCase(db, db),
    exportSocialData: new ExportSocialDataUseCase(db, db, db),
  };
  return { services, friendRequestsSent, invitesSent };
}

/** One app's worth of services over shared in-memory storage, with a clock the test moves. */
export function createApiHarness() {
  const time = { now: T0 };
  const clock = { now: () => time.now };
  const socialDb = new MemorySocial();
  const tournamentRepo = new MemoryTournamentRepository();
  const readModels = new StubReadModels();
  const account = createAccount(clock, tournamentRepo, readModels);
  const tournaments = createTournaments(clock, tournamentRepo, socialDb);
  const social = createSocial(clock, socialDb, account.services, tournaments.services);
  return { time, socialDb, tournamentRepo, readModels, account, tournaments, social };
}

export type ApiHarness = ReturnType<typeof createApiHarness>;

/** A signed-in account as getSessionUser() returns it; the handle doubles as the user id. */
export function sessionUser(username: string): SessionUser {
  return { id: username, email: `${username}@example.test`, emailVerified: true, username, displayUsername: username.toUpperCase() };
}

export interface ApiRequestInit {
  json?: unknown;
  body?: BodyInit;
  headers?: Record<string, string>;
}

/** A same-origin request to the app, as the browser sends it. */
export function apiRequest(method: string, path: string, { json, body, headers = {} }: ApiRequestInit = {}): Request {
  const allHeaders: Record<string, string> = { origin: APP_ORIGIN, ...headers };
  if (json !== undefined) allHeaders['content-type'] = 'application/json';
  return new Request(`${APP_ORIGIN}${path}`, { method, headers: allHeaders, body: json !== undefined ? JSON.stringify(json) : body });
}

/** The second argument Next.js passes a route handler (params are a promise since Next 15). */
export function routeParams<P extends Record<string, string>>(params: P): { params: Promise<P> } {
  return { params: Promise.resolve(params) };
}

export const NO_PARAMS = routeParams({});

export async function errorOf(response: Response): Promise<{ code?: string; message?: string }> {
  const body = (await response.json()) as { error?: { code?: string; message?: string } };
  return body.error ?? {};
}
