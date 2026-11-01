import type { AuthProviderId } from '@/infrastructure/auth/auth-capabilities';

/** Query params the provider round trip lands on: ?linked=<provider> or ?error=<better-auth code>. */
export const LINKED_PARAM = 'linked';
export const LINK_ERROR_PARAM = 'error';

const LINK_ERRORS: Record<string, string> = {
  account_already_linked_to_different_user: 'That account is already connected to another Wizard Party account. Disconnect it there first.',
  access_denied: 'Connection cancelled. Nothing was changed.',
  unable_to_link_account: 'The account could not be connected. Please try again.',
  "email_doesn't_match": 'The account could not be connected because its email does not match.',
};

export type ProviderLinkResult = { tone: 'success' | 'error'; message: string } | null;

export function describeProviderLinkResult(
  params: URLSearchParams,
  labels: Record<AuthProviderId, string>
): ProviderLinkResult {
  const error = params.get(LINK_ERROR_PARAM);
  if (error) return { tone: 'error', message: LINK_ERRORS[error] ?? 'The account could not be connected. Please try again.' };
  const linked = params.get(LINKED_PARAM) as AuthProviderId | null;
  if (linked && linked in labels) return { tone: 'success', message: `${labels[linked]} connected. You can now sign in with it too.` };
  return null;
}

export function linkCallbackUrls(provider: AuthProviderId) {
  return {
    callbackURL: `/account?tab=security&${LINKED_PARAM}=${provider}`,
    errorCallbackURL: '/account?tab=security',
  };
}
