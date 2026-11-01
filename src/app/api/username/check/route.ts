import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSessionUser } from '@/infrastructure/auth/auth';
import { isDatabaseConfigured } from '@/infrastructure/db/neon';
import { getSocialServices } from '@/infrastructure/social/social-container';
import { checkRateLimit } from '@/lib/redis';

/** Account the name belongs to when it is not the requester's own (guests can't play as them). */
async function isAccountNameOfSomeoneElse(name: string, request: Request): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const owner = await getSocialServices().nameOwner.execute(name);
  if (!owner) return false;
  const user = await getSessionUser(request.headers);
  return user?.id !== owner;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();

    // Basic validation
    if (trimmedUsername.length === 0) {
      return NextResponse.json(
        { available: false, error: 'Username cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedUsername.length > 20) {
      return NextResponse.json(
        { available: false, error: 'Username must be 20 characters or less' },
        { status: 400 }
      );
    }

    // Rate limiting by IP
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
               headersList.get('x-real-ip') ||
               'unknown';

    const rateLimit = await checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          available: false,
          error: 'Too many requests. Please wait a moment.',
          retryAfter: 60
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': '0',
          }
        }
      );
    }

    if (await isAccountNameOfSomeoneElse(trimmedUsername, request)) {
      return NextResponse.json({ available: false, error: 'This name belongs to a registered player.' });
    }

    // Guest names are not reserved: several guests may share one. Only account names are taken.
    return NextResponse.json({ available: true }, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      }
    });
  } catch (error) {
    console.error('[Username Check] Error:', error);
    // On error, allow the username to prevent blocking users
    return NextResponse.json({ available: true, error: 'Check failed' });
  }
}
