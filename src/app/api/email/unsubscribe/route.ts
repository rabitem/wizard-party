import { verifyUnsubscribeToken } from '@/infrastructure/email/email-unsubscribe';
import { isDatabaseConfigured } from '@/infrastructure/db/neon';
import { getSocialServices } from '@/infrastructure/social/social-container';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const confirmPage = (req: Request, query: string) => Response.redirect(new URL(`/unsubscribe?${query}`, req.url), 303);

/**
 * Links in mail are opened by scanners and previews, so GET never changes anything: it leads to a
 * confirmation page. The change is a POST, from that page or as RFC 8058 one-click unsubscribe.
 */
export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  return confirmPage(req, new URLSearchParams({ token }).toString());
}

export async function POST(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get('token');
  // Mailbox providers send "List-Unsubscribe=One-Click" and expect a plain 2xx, whatever happens.
  const oneClick = (await req.text().catch(() => '')).includes('List-Unsubscribe=One-Click');
  const subject = verifyUnsubscribeToken(token);
  if (!subject || !isDatabaseConfigured()) {
    console.warn(JSON.stringify({ level: 'warn', msg: 'unsubscribe_rejected', oneClick }));
    return oneClick ? new Response('invalid link', { status: 202 }) : confirmPage(req, 'status=invalid');
  }
  await getSocialServices().unsubscribeFromEmails.execute(subject.userId, subject.category);
  return oneClick ? new Response('unsubscribed', { status: 200 }) : confirmPage(req, `status=done&category=${subject.category}`);
}
