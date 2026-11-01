import 'server-only';

import {
  DeleteCustomSoundUseCase,
  EnsureProfileUseCase,
  ExportAccountDataUseCase,
  GetAccountOverviewUseCase,
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
  UpdateCustomSoundUseCase,
  UnpinGameUseCase,
  UpdateProfileUseCase,
  UploadCustomSoundUseCase,
} from '@shared/application/use-cases/account';

import { PostgresTournamentHistoryReader } from '../tournament/postgres-tournament-history-reader';

import { PostgresAccountDocumentRepository } from './postgres-account-document-repository';
import { PostgresCustomSoundRepository } from './postgres-custom-sound-repository';
import { PostgresGameResultRepository } from './postgres-game-result-repository';
import { PostgresPlayerProgressRepository } from './postgres-player-progress-repository';
import { PostgresCommunityStatsReader } from './postgres-community-stats-reader';
import { PostgresLeaderboardReader } from './postgres-leaderboard-reader';
import { PostgresProfileRepository } from './postgres-profile-repository';
import { PostgresPublicProfileReader } from './postgres-public-profile-reader';
import { VercelBlobAudioStorage } from './vercel-blob-audio-storage';

/** Composition root of the account context: the only place that knows concrete adapters. */
function createAccountServices() {
  const clock = { now: () => Date.now() };
  const results = new PostgresGameResultRepository();
  const progress = new PostgresPlayerProgressRepository();
  const profiles = new PostgresProfileRepository();
  const documents = new PostgresAccountDocumentRepository();
  const sounds = new PostgresCustomSoundRepository();
  const blobs = new VercelBlobAudioStorage();
  const publicProfiles = new PostgresPublicProfileReader();
  // Completed tournaments feed award XP and tournament achievements.
  const tournamentHistory = new PostgresTournamentHistoryReader();

  const calculator = new ProgressCalculator(results, progress, tournamentHistory, clock);
  const ensureProfile = new EnsureProfileUseCase(profiles, clock);

  return {
    ensureProfile,
    getOverview: new GetAccountOverviewUseCase(ensureProfile, calculator, results),
    updateProfile: new UpdateProfileUseCase(ensureProfile, profiles),
    recordGameResults: new RecordGameResultsUseCase(results, calculator, clock),
    listGameHistory: new ListGameHistoryUseCase(results),
    pinGame: new PinGameUseCase(results, clock),
    unpinGame: new UnpinGameUseCase(results),
    getPublicProfile: new GetPublicProfileUseCase(publicProfiles),
    getLeaderboards: new GetLeaderboardsUseCase(new PostgresLeaderboardReader()),
    getCommunityStats: new GetCommunityStatsUseCase(new PostgresCommunityStatsReader()),
    importGuestProgress: new ImportGuestProgressUseCase(results, progress, calculator, clock),
    listDocuments: new ListAccountDocumentsUseCase(documents),
    saveDocument: new SaveAccountDocumentUseCase(documents),
    listCustomSounds: new ListCustomSoundsUseCase(sounds),
    uploadCustomSound: new UploadCustomSoundUseCase(sounds, blobs, clock),
    updateCustomSound: new UpdateCustomSoundUseCase(sounds),
    deleteCustomSound: new DeleteCustomSoundUseCase(sounds, blobs),
    exportAccountData: new ExportAccountDataUseCase(profiles, results, progress, documents, sounds),
    purgeAccountStorage: new PurgeAccountStorageUseCase(sounds, blobs),
    /** IProgressRefresher of the tournament context: recomputes everyone involved on completion. */
    progressRefresher: new PlayerProgressRefresher(calculator),
  };
}

export type AccountServices = ReturnType<typeof createAccountServices>;

let services: AccountServices | null = null;

export function getAccountServices(): AccountServices {
  services ??= createAccountServices();
  return services;
}
