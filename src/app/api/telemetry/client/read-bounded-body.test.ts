import { describe, expect, it } from 'vitest';

import { readBoundedBody } from './read-bounded-body';

const encoder = new TextEncoder();

/** A chunked body without Content-Length that records how many chunks were pulled. */
function chunkedRequest(chunks: string[]) {
  let pulled = 0;
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (pulled === chunks.length) return controller.close();
      controller.enqueue(encoder.encode(chunks[pulled++]));
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request('https://example.test/', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
  return { request, pulled: () => pulled, cancelled: () => cancelled };
}

describe('readBoundedBody', () => {
  it('reads bodies up to the limit, including multi-byte text', async () => {
    const request = new Request('https://example.test/', { method: 'POST', body: 'grüß' });
    expect(await readBoundedBody(request, 6)).toBe('grüß');
  });

  it('rejects a declared oversize body without reading it', async () => {
    const request = new Request('https://example.test/', { method: 'POST', body: 'x', headers: { 'content-length': '100' } });
    expect(await readBoundedBody(request, 10)).toBeNull();
    expect(request.bodyUsed).toBe(false);
  });

  it('stops reading a chunked body once it exceeds the limit', async () => {
    const chunked = chunkedRequest(['12345', '67890', 'abcde', 'fghij']);
    expect(await readBoundedBody(chunked.request, 8)).toBeNull();
    expect(chunked.pulled()).toBeLessThan(4);
    expect(chunked.cancelled()).toBe(true);
  });

  it('returns an empty string for an empty body', async () => {
    expect(await readBoundedBody(new Request('https://example.test/', { method: 'POST' }), 10)).toBe('');
  });
});
