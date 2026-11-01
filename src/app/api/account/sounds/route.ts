import { AccountError } from '@shared/application/use-cases/account';

import { accountRoute } from '../account-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = accountRoute('GET /api/account/sounds', async ({ user, services }) =>
  Response.json({ sounds: await services.listCustomSounds.execute(user.id) })
);

/** multipart/form-data: `file` (audio) + `metadata` (JSON: id, name, duration, category, roles). */
export const POST = accountRoute('POST /api/account/sounds', async ({ req, user, services }) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const metadata = form?.get('metadata');
  if (!(file instanceof Blob) || typeof metadata !== 'string') {
    throw new AccountError('invalid_input', 'expected file and metadata fields');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(metadata);
  } catch {
    throw new AccountError('invalid_input', 'metadata must be JSON');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sound = await services.uploadCustomSound.execute(user.id, (parsed ?? {}) as Record<string, unknown>, bytes);
  return Response.json({ sound }, { status: 201 });
});
