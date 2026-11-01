import 'server-only';

import { InboxNotifier } from '@shared/application/use-cases/inbox';
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
} from '@shared/application/use-cases/tournament';
import { cryptoTournamentIds } from '@shared/tournament';

import { after } from 'next/server';

import { getAccountServices } from '../account/account-container';
import { revalidatePublicProfiles } from '../account/public-profile-cache';
import { RedisUsageCounter } from '../rate-limit/redis-usage-counter';
import { PostgresInboxRepository } from '../social/postgres-inbox-repository';
import { PostgresPlayerDirectory } from '../social/postgres-player-directory';
import { PostgresSocialGraphRepository } from '../social/postgres-social-graph-repository';
import { DeferredProgressRefresher, type BackgroundScheduler } from './deferred-progress-refresher';
import { HmacTournamentTicketSigner } from './hmac-tournament-ticket-signer';
import { PostgresTournamentHistoryReader } from './postgres-tournament-history-reader';
import { PostgresTournamentRepository } from './postgres-tournament-repository';
import { loadUsernames } from './postgres-username-lookup';
import { ProfileCacheProgressRefresher } from './profile-cache-progress-refresher';
import { RedisTournamentThrottle } from './redis-tournament-throttle';
import { isTournamentsAvailable, tournamentSecret } from './tournament-config';

/** Side effects (notifications, progress) must never fail a saved state change: log them. */
function reportEffectError(effect: string, error: unknown): void {
  console.error(JSON.stringify({ level: 'error', msg: 'tournament_effect_failed', effect, error: error instanceof Error ? error.message : String(error) }));
}

/** After the response when inside a request (Vercel keeps the function alive), else right away. */
const inBackground: BackgroundScheduler = (task) => {
  try {
    after(task);
  } catch {
    void task();
  }
};

/** Composition root of the tournament context: the only place that knows concrete adapters. */
function createTournamentServices() {
  const clock = { now: () => Date.now() };
  const repository = new PostgresTournamentRepository();
  const history = new PostgresTournamentHistoryReader();
  const directory = new PostgresPlayerDirectory();
  const relationships = new PostgresSocialGraphRepository();
  const inbox = new InboxNotifier(new PostgresInboxRepository(), clock);
  const throttle = new RedisTournamentThrottle(new RedisUsageCounter());
  // Award XP and tournament achievements are the account context's business: recompute through it,
  // then purge the participants' cached public profiles so the new trophies show at once.
  let profileAwareRefresher: ProfileCacheProgressRefresher | null = null;
  const progress = new DeferredProgressRefresher(
    () => (profileAwareRefresher ??= new ProfileCacheProgressRefresher(getAccountServices().progressRefresher, loadUsernames, revalidatePublicProfiles)),
    inBackground,
    reportEffectError
  );
  // Without the shared secret no table can be played: the store then moves nothing (see TournamentStore).
  const store = new TournamentStore(repository, new TournamentEffects(inbox, progress, reportEffectError), clock, isTournamentsAvailable);

  return {
    create: new CreateTournamentUseCase(repository, store, directory, throttle, cryptoTournamentIds, clock),
    update: new UpdateTournamentUseCase(store, cryptoTournamentIds),
    start: new StartTournamentUseCase(store),
    cancel: new CancelTournamentUseCase(store),
    resolveStaleMatch: new ResolveStaleMatchUseCase(store),
    register: new RegisterForTournamentUseCase(store, directory, throttle),
    withdraw: new WithdrawFromTournamentUseCase(store),
    invite: new InviteToTournamentUseCase(store, directory, relationships, inbox, throttle),
    get: new GetTournamentUseCase(store),
    list: new ListTournamentsUseCase(repository, store, clock),
    listMine: new ListMyTournamentsUseCase(repository, history),
    trophyCabinet: new GetTrophyCabinetUseCase(history),
    issueTicket: new IssueMatchTicketUseCase(store, new HmacTournamentTicketSigner(() => tournamentSecret()), throttle),
    recordMatchResult: new RecordMatchResultUseCase(store),
    recordMatchProgress: new RecordMatchProgressUseCase(store),
    exportData: new ExportTournamentDataUseCase(repository, history),
    purgeData: new PurgeTournamentDataUseCase(repository, store),
  };
}

export type TournamentServices = ReturnType<typeof createTournamentServices>;

let services: TournamentServices | null = null;

export function getTournamentServices(): TournamentServices {
  services ??= createTournamentServices();
  return services;
}
