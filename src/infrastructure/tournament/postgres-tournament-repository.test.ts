import { beforeEach, describe, expect, it, vi } from 'vitest';

interface Statement {
  text: string;
  params: unknown[];
}

/** A fake of Neon's HTTP driver: records statements and transactions, answers queued results. */
const db = vi.hoisted(() => ({
  transactions: [] as { statements: Statement[]; options: unknown }[],
  /** Answers of the next transactions (an Error is thrown instead). */
  answers: [] as unknown[],
  queries: [] as Statement[],
  queryRows: [] as unknown[],
}));

vi.mock('server-only', () => ({}));
vi.mock('../db/neon', () => {
  const sql = Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      db.queries.push({ text: strings.join('?'), params: values });
      return Promise.resolve(db.queryRows);
    },
    {
      query: (text: string, params: unknown[]) => {
        const statement: Statement = { text, params };
        // Awaited directly (lists) it runs as a query; inside a transaction it is only collected.
        return Object.assign(statement, {
          then: (resolve: (rows: unknown[]) => void) => {
            db.queries.push(statement);
            resolve(db.queryRows);
          },
        });
      },
      transaction: async (statements: Statement[], options?: unknown) => {
        db.transactions.push({ statements, options });
        const answer = db.answers.shift();
        if (answer instanceof Error) throw answer;
        return answer ?? statements.map(() => []);
      },
    }
  );
  return { getSql: () => sql };
});

import { recordMatchProgress, startTournament } from '@shared/domain/tournament';
import { HOST_ID, T0, playToCompletion, testDraft, testTournament, withEntrants } from '@shared/domain/tournament/tournament.fixtures';

import { PostgresTournamentRepository } from './postgres-tournament-repository';
import type { TournamentSavePayload } from './tournament-save-payload';

const versionConflict = () => Object.assign(new Error('division by zero'), { code: '22012' });

const registered = () => withEntrants(testTournament(testDraft()), 6);
const completed = () => playToCompletion(startTournament(registered(), HOST_ID, T0 + 1000));

function lastTransaction() {
  const transaction = db.transactions[db.transactions.length - 1];
  if (!transaction) throw new Error('no transaction ran');
  return transaction;
}

function payloadOf(statement: Statement | undefined): TournamentSavePayload {
  if (!statement) throw new Error('no statement');
  return JSON.parse(statement.params[0] as string) as TournamentSavePayload;
}

describe('PostgresTournamentRepository', () => {
  beforeEach(() => {
    db.transactions = [];
    db.answers = [];
    db.queries = [];
    db.queryRows = [];
  });

  describe('save', () => {
    it('should insert a new tournament (expected version 0) behind the collision guard', async () => {
      const tournament = { ...registered(), version: 1 };
      await expect(new PostgresTournamentRepository().save(tournament, 0)).resolves.toBe('saved');

      const [first, ...rest] = lastTransaction().statements;
      expect(first?.text).toContain('INSERT INTO tournaments');
      expect(first?.text).toContain('1 / (SELECT count(*)::int FROM inserted)');
      // Registration: tournament row, withdrawn entrants, entrants; no tables, results or awards yet.
      expect(rest.map((statement) => statement.text)).toEqual([
        expect.stringContaining('DELETE FROM tournament_entrants'),
        expect.stringContaining('INSERT INTO tournament_entrants'),
      ]);
      expect(payloadOf(first).entrants).toHaveLength(6);
    });

    it('should update an existing tournament only from the expected version', async () => {
      const tournament = { ...completed(), version: 9 };
      await new PostgresTournamentRepository().save(tournament, 8);

      const statements = lastTransaction().statements;
      expect(statements[0]?.text).toContain('UPDATE tournaments SET');
      expect(statements[0]?.text).toContain('tournaments.version = $2::int');
      expect(statements[0]?.params[1]).toBe(8);
      expect(payloadOf(statements[0]).tournament.version).toBe(9);
      expect(statements.map((statement) => statement.text)).toEqual([
        expect.any(String),
        expect.stringContaining('DELETE FROM tournament_entrants'),
        expect.stringContaining('INSERT INTO tournament_entrants'),
        expect.stringContaining('INSERT INTO tournament_matches'),
        expect.stringContaining('INSERT INTO tournament_match_results'),
        expect.stringContaining('INSERT INTO tournament_awards'),
      ]);
    });

    it('should answer conflict when the version check aborted the transaction', async () => {
      db.answers.push(versionConflict());
      await expect(new PostgresTournamentRepository().save({ ...registered(), version: 3 }, 2)).resolves.toBe('conflict');
    });

    it('should rethrow every other database error', async () => {
      db.answers.push(Object.assign(new Error('connection reset'), { code: '08006' }));
      await expect(new PostgresTournamentRepository().save({ ...registered(), version: 3 }, 2)).rejects.toThrow('connection reset');
    });

    it('should not rewrite tables and awards it already stored unchanged', async () => {
      const repository = new PostgresTournamentRepository();
      const tournament = { ...completed(), version: 5 };
      await repository.save(tournament, 4);
      await repository.save({ ...tournament, version: 6 }, 5);

      const statements = lastTransaction().statements;
      expect(statements).toHaveLength(3);
      const payload = payloadOf(statements[0]);
      expect(payload.matches).toEqual([]);
      expect(payload.results).toEqual([]);
      expect(payload.awards).toEqual([]);
      expect(payload.entrants.length).toBeGreaterThan(0);
    });

    it('should rewrite a stored pending table once the worker reported progress on it', async () => {
      const repository = new PostgresTournamentRepository();
      const running = { ...startTournament(registered(), HOST_ID, T0 + 1000), version: 2 };
      await repository.save(running, 1);
      const [match] = running.matches;
      const progress = { matchId: match.id, roomCode: match.roomCode, round: 2, maxRounds: 15, at: T0 + 5000 };
      const playing = { ...recordMatchProgress(running, progress, T0 + 5000).tournament, version: 3 };
      await repository.save(playing, 2);

      const statements = lastTransaction().statements;
      const upsert = statements.find((statement) => statement.text.includes('INSERT INTO tournament_matches'));
      expect(upsert?.text).toContain('live_round = EXCLUDED.live_round');
      expect(payloadOf(statements[0]).matches).toEqual([
        expect.objectContaining({ id: match.id, live: { round: 2, maxRounds: 15, lastActivityAt: new Date(T0 + 5000).toISOString() } }),
      ]);
    });

    it('should write everything again after a conflict (nothing was stored)', async () => {
      const repository = new PostgresTournamentRepository();
      const tournament = { ...completed(), version: 5 };
      db.answers.push(versionConflict());
      await repository.save(tournament, 4);
      await repository.save(tournament, 4);

      const payload = payloadOf(lastTransaction().statements[0]);
      expect(payload.matches).toHaveLength(tournament.matches.length);
      expect(payload.awards).toHaveLength(tournament.awards.length);
    });
  });

  describe('get', () => {
    it('should read the aggregate in one read-only snapshot and answer null for an unknown id', async () => {
      await expect(new PostgresTournamentRepository().get('abcdefghjk23')).resolves.toBeNull();

      const { statements, options } = lastTransaction();
      expect(options).toEqual({ readOnly: true, isolationLevel: 'RepeatableRead' });
      expect(statements).toHaveLength(5);
      for (const statement of statements) expect(statement.params).toEqual(['abcdefghjk23']);
    });
  });

  describe('list', () => {
    // Each public list is the public tournaments of one stored status, newest first by its own
    // column (the partial indexes of db/migrations), paged by a (column, id) keyset.
    describe.each([
      { list: 'open', stored: 'registration', column: 'created_at' },
      { list: 'live', stored: 'running', column: 'started_at' },
      { list: 'finished', stored: 'completed', column: 'completed_at' },
    ] as const)('$list', ({ list, stored, column }) => {
      it(`should read the first page of public ${stored} tournaments by ${column} with the limit only`, async () => {
        await new PostgresTournamentRepository().list({ status: list, limit: 21 });
        const [query] = db.queries;
        expect(query?.params).toEqual([21]);
        expect(query?.text).toContain(`t.status = '${stored}'`);
        expect(query?.text).toContain("t.visibility = 'public'");
        expect(query?.text).toContain(`ORDER BY t.${column} DESC, t.id DESC`);
        expect(query?.text).not.toContain('$2');
      });

      it('should continue strictly after the keyset position (exact milliseconds)', async () => {
        await new PostgresTournamentRepository().list({ status: list, limit: 21, after: { sortAt: T0 + 123, id: 'abcdefghjk23' } });
        const [query] = db.queries;
        expect(query?.params).toEqual([21, new Date(T0 + 123).toISOString(), 'abcdefghjk23']);
        expect(query?.text).toContain(`(t.${column}, t.id) < ($2::timestamptz, $3)`);
        expect(query?.text).toContain(`t.status = '${stored}'`);
      });
    });
  });

  describe('forgetHost', () => {
    it("should clear a deleted host's handle and name on all of their tournaments", async () => {
      await new PostgresTournamentRepository().forgetHost('user-1', 'Former host');
      expect(db.queries[0]?.params).toEqual(['Former host', 'user-1']);
      expect(db.queries[0]?.text).toContain('host_username = NULL');
      expect(db.queries[0]?.text).toContain('WHERE host_user_id = ?');
    });
  });
});
