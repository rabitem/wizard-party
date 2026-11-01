import { UNICODE_FONTS } from '@/presentation/config/assets.config';

export const runtime = 'nodejs';

/** codepoint-index/plane0/0-ff.json, font-meta/latin.json, font-files/<id>/<category>.<style>.<weight>.woff */
const SAFE_PATH = /^(codepoint-index|font-meta|font-files)(\/[a-z0-9_.-]+){1,3}\.(json|woff)$/i;
const CONTENT_TYPES = { json: 'application/json', woff: 'font/woff' } as const;
const UPSTREAM_TIMEOUT_MS = 10_000;

/**
 * Same-origin proxy for troika's unicode fallback fonts. The upstream request carries no client
 * headers, so the player's IP address never reaches the CDN. Files are versioned upstream
 * (@v1.0.1), so responses are cached as immutable at our edge.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const path = (await params).path.join('/');
  if (!SAFE_PATH.test(path)) return new Response('Not found', { status: 404 });

  let upstream: Response;
  try {
    upstream = await fetch(`${UNICODE_FONTS.UPSTREAM_URL}/${path}`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: 'force-cache',
    });
  } catch {
    return new Response('Upstream unavailable', { status: 502 });
  }
  if (!upstream.ok) return new Response('Not found', { status: upstream.status === 404 ? 404 : 502 });

  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase() as keyof typeof CONTENT_TYPES;
  return new Response(upstream.body, {
    headers: {
      'content-type': CONTENT_TYPES[extension],
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
