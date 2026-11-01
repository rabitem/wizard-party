/**
 * Reads a request body as UTF-8 text, stopping as soon as it exceeds `maxBytes` (null). Unlike
 * `req.text()` this never buffers more than the limit, also for chunked bodies that declare no
 * Content-Length.
 */
export async function readBoundedBody(req: Request, maxBytes: number): Promise<string | null> {
  const declaredLength = Number(req.headers.get('content-length') ?? 0);
  if (declaredLength > maxBytes) return null;
  if (!req.body) return '';

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  // Stream chunks are inherently sequential.
  /* eslint-disable no-await-in-loop */
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  /* eslint-enable no-await-in-loop */

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}
