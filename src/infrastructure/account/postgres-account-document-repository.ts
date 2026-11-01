import 'server-only';

import type { AccountDocument, IAccountDocumentRepository, SaveDocumentResult } from '@shared/application/ports/account';

import { getSql } from '../db/neon';

interface DocumentRow {
  doc_key: string;
  data: unknown;
  version: number;
  updated_at: string | Date;
}

const toDocument = (row: DocumentRow): AccountDocument => ({
  key: row.doc_key,
  data: row.data,
  version: row.version,
  updatedAt: new Date(row.updated_at).getTime(),
});

export class PostgresAccountDocumentRepository implements IAccountDocumentRepository {
  async list(userId: string): Promise<AccountDocument[]> {
    const rows = (await getSql()`
      SELECT doc_key, data, version, updated_at FROM account_documents WHERE user_id = ${userId}
    `) as DocumentRow[];
    return rows.map(toDocument);
  }

  async save(userId: string, key: string, data: unknown, expectedVersion: number): Promise<SaveDocumentResult> {
    const sql = getSql();
    const json = JSON.stringify(data);
    // Compare-and-swap in one statement: create when expecting 0, otherwise bump a matching version.
    const rows = (expectedVersion === 0
      ? await sql`
          INSERT INTO account_documents (user_id, doc_key, data, version) VALUES (${userId}, ${key}, ${json}::jsonb, 1)
          ON CONFLICT (user_id, doc_key) DO NOTHING
          RETURNING doc_key, data, version, updated_at`
      : await sql`
          UPDATE account_documents SET data = ${json}::jsonb, version = version + 1, updated_at = now()
          WHERE user_id = ${userId} AND doc_key = ${key} AND version = ${expectedVersion}
          RETURNING doc_key, data, version, updated_at`) as DocumentRow[];
    if (rows[0]) return { ok: true, document: toDocument(rows[0]) };

    const current = (await sql`
      SELECT doc_key, data, version, updated_at FROM account_documents WHERE user_id = ${userId} AND doc_key = ${key}
    `) as DocumentRow[];
    return { ok: false, reason: 'conflict', current: current[0] ? toDocument(current[0]) : null };
  }
}
