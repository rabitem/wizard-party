import { describe, expect, it } from 'vitest';

import { AUTH_TABLES } from './auth-options';
import { createTestAuth, liveCookies, OTHER_PASSWORD, PASSWORD } from './auth-test-support';
import { DISABLED_AUTH_PATHS, EMAIL_VERIFICATION_REQUIRED_FIELD, signInGuards } from './sign-in-guards';
import { USERNAME_CHANGED_AT_FIELD, USERNAME_ERROR_CODES } from './username-hooks';

describe('auth options (integration)', () => {
  describe('with email delivery', () => {
    it('should send a code on sign-up and refuse a password sign-in until the email is confirmed', async () => {
      const t = createTestAuth({ canDeliver: true });
      const signUp = await t.signUp('ada@example.com', 'ada');
      expect(signUp.status).toBe(200);
      expect(signUp.body?.token).toBeNull();
      expect(t.lastCode('ada@example.com')).not.toBeNull();
      expect(t.userByEmail('ada@example.com')?.[EMAIL_VERIFICATION_REQUIRED_FIELD]).toBe(true);

      const results = [
        await t.post('/sign-in/email', { email: 'ada@example.com', password: PASSWORD }),
        await t.post('/sign-in/username', { username: 'ADA', password: PASSWORD }),
      ];
      for (const result of results) {
        expect(result.status).toBe(403);
        expect(result.body).toMatchObject({ code: 'EMAIL_NOT_VERIFIED', email: 'ada@example.com' });
        expect(liveCookies(result.cookies)).not.toMatch(/session_token|session_data/);
      }
      expect(t.db[AUTH_TABLES.session]).toHaveLength(0);
    });

    it('should not reveal the account email to a wrong password', async () => {
      const t = createTestAuth({ canDeliver: true });
      await t.signUp('ada@example.com', 'ada');
      const result = await t.post('/sign-in/username', { username: 'ada', password: OTHER_PASSWORD });
      expect(result.status).toBe(401);
      expect(JSON.stringify(result.body)).not.toContain('ada@example.com');
    });

    it('should check the email before 2FA turns the sign-in into a challenge', async () => {
      const t = createTestAuth({ canDeliver: true });
      await t.signUp('ada@example.com', 'ada');
      t.patchUser('ada@example.com', { twoFactorEnabled: true });
      const result = await t.post('/sign-in/email', { email: 'ada@example.com', password: PASSWORD });
      expect(result.status).toBe(403);
      expect(result.body?.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('should sign in after the code was confirmed with the account password', async () => {
      const t = createTestAuth({ canDeliver: true });
      await t.signUp('ada@example.com', 'ada');
      const verify = await t.post('/email-otp/verify-email', { email: 'ada@example.com', otp: t.lastCode('ada@example.com'), password: PASSWORD });
      expect(verify.status).toBe(200);
      const signIn = await t.post('/sign-in/username', { username: 'ada', password: PASSWORD });
      expect(signIn.status).toBe(200);
      expect(signIn.body?.token).toEqual(expect.any(String));
    });

    it('should keep accounts from before email delivery able to sign in', async () => {
      const t = createTestAuth({ canDeliver: true });
      await t.signUp('old@example.com', 'oldtimer');
      // As stored by the migration default for accounts created without mail.
      t.patchUser('old@example.com', { [EMAIL_VERIFICATION_REQUIRED_FIELD]: false });
      const result = await t.post('/sign-in/email', { email: 'old@example.com', password: PASSWORD });
      expect(result.status).toBe(200);
      expect(result.body?.token).toEqual(expect.any(String));
    });

    it('should mail a notice instead of a code when the email already has an account', async () => {
      const t = createTestAuth({ canDeliver: true });
      await t.signUp('ada@example.com', 'ada');
      const before = t.mail.length;
      const duplicate = await t.signUp('ada@example.com', 'ada_two', OTHER_PASSWORD);
      expect(duplicate.status).toBe(200);
      expect(duplicate.body?.token).toBeNull();
      const sent = t.mail.slice(before);
      expect(sent).toHaveLength(1);
      expect(sent[0].subject).toBe('You already have an account');
      expect(sent[0].text).not.toMatch(/\b\d{6}\b/);
      expect(t.users()).toHaveLength(1);
    });

    it('should not let a second sign-up confirm an account someone else created (pre-account hijacking)', async () => {
      const t = createTestAuth({ canDeliver: true });
      // The attacker registers the victim's address first, with the attacker's password.
      await t.signUp('victim@example.com', 'squatter', OTHER_PASSWORD);
      // The victim signs up, sees the code step and asks for a new code.
      await t.signUp('victim@example.com', 'victim', PASSWORD);
      expect((await t.post('/email-otp/send-verification-otp', { email: 'victim@example.com', type: 'email-verification' })).status).toBe(200);
      const code = t.lastCode('victim@example.com');

      const verify = await t.post('/email-otp/verify-email', { email: 'victim@example.com', otp: code, password: PASSWORD });
      expect(verify.status).toBe(403);
      expect(verify.body?.code).toBe('ACCOUNT_PASSWORD_MISMATCH');
      const withoutPassword = await t.post('/email-otp/verify-email', { email: 'victim@example.com', otp: code });
      expect(withoutPassword.status).toBe(403);

      expect(t.userByEmail('victim@example.com')?.emailVerified).toBe(false);
      // The squatter still cannot sign in.
      expect((await t.post('/sign-in/email', { email: 'victim@example.com', password: OTHER_PASSWORD })).status).toBe(403);
    });

    it('should let a signed-in owner confirm their email without the password', async () => {
      const t = createTestAuth({ canDeliver: true });
      await t.signUp('old@example.com', 'oldtimer');
      t.patchUser('old@example.com', { [EMAIL_VERIFICATION_REQUIRED_FIELD]: false });
      const signIn = await t.post('/sign-in/email', { email: 'old@example.com', password: PASSWORD });
      const cookie = liveCookies(signIn.cookies);
      await t.post('/email-otp/send-verification-otp', { email: 'old@example.com', type: 'email-verification' }, cookie);
      const verify = await t.post('/email-otp/verify-email', { email: 'old@example.com', otp: t.lastCode('old@example.com') }, cookie);
      expect(verify.status).toBe(200);
      expect(t.userByEmail('old@example.com')?.emailVerified).toBe(true);
    });

    it('should refuse to send sign-in codes', async () => {
      const t = createTestAuth({ canDeliver: true });
      await t.signUp('ada@example.com', 'ada');
      const sent = t.mail.length;
      const result = await t.post('/email-otp/send-verification-otp', { email: 'ada@example.com', type: 'sign-in' });
      expect(result.status).toBe(400);
      expect(t.mail).toHaveLength(sent);
    });

    // Passwordless sign-in would skip 2FA; the email-change paths are not offered yet.
    it.each(DISABLED_AUTH_PATHS)('should not offer %s', async (path) => {
      const t = createTestAuth({ canDeliver: true });
      await t.signUp('ada@example.com', 'ada');
      const result = await t.post(path, { email: 'ada@example.com', otp: '123456', newEmail: 'eve@example.com' });
      expect(result.status).toBe(404);
    });
  });

  describe('provider sign-ins', () => {
    type AfterHook = NonNullable<NonNullable<ReturnType<typeof signInGuards>['hooks']>['after']>[number];
    const refusesUnconfirmedEmailOn = (path: string) =>
      (signInGuards({ enforceEmailVerification: true }).hooks?.after ?? []).some((hook) =>
        hook.matcher({ path } as Parameters<AfterHook['matcher']>[0])
      );

    // No identity provider is reachable in this harness, so the endpoints that finish an id-token
    // or OAuth sign-in are checked against the guard itself. A provider account has no password
    // and no code step: refusing it with EMAIL_NOT_VERIFIED would lock it out for good.
    it.each(['/sign-in/social', '/callback/:id'])('should never refuse a provider sign-in through %s for an unconfirmed email', (path) => {
      expect(refusesUnconfirmedEmailOn('/sign-in/email')).toBe(true);
      expect(refusesUnconfirmedEmailOn(path)).toBe(false);
    });
  });

  describe('without email delivery', () => {
    it('should let an account that needs confirmation sign in while mail is down', async () => {
      const t = createTestAuth({ canDeliver: false });
      await t.signUp('ada@example.com', 'ada');
      t.patchUser('ada@example.com', { [EMAIL_VERIFICATION_REQUIRED_FIELD]: true, emailVerified: false });
      const result = await t.post('/sign-in/email', { email: 'ada@example.com', password: PASSWORD });
      expect(result.status).toBe(200);
      expect(result.body?.token).toEqual(expect.any(String));
    });

    it('should sign up and sign in without a code', async () => {
      const t = createTestAuth({ canDeliver: false });
      const signUp = await t.signUp('ada@example.com', 'ada');
      expect(signUp.body?.token).toEqual(expect.any(String));
      expect(t.userByEmail('ada@example.com')?.[EMAIL_VERIFICATION_REQUIRED_FIELD]).toBe(false);
      expect((await t.post('/sign-in/username', { username: 'ada', password: PASSWORD })).status).toBe(200);
      expect(t.mail).toHaveLength(0);
    });
  });

  describe('public profile cache', () => {
    it('should purge the old and the new handle on a rename, and the handle on deletion', async () => {
      const t = createTestAuth({ canDeliver: false });
      const signUp = await t.signUp('ada@example.com', 'Merlin');
      const cookie = liveCookies(signUp.cookies);
      t.invalidatePublicProfiles.mockClear();

      const rename = await t.post('/update-user', { username: 'xyz', displayUsername: 'Xyz' }, cookie);
      expect(rename.status).toBe(200);
      expect(t.invalidatePublicProfiles).toHaveBeenCalledWith(['merlin', 'xyz']);

      t.invalidatePublicProfiles.mockClear();
      const remove = await t.post('/delete-user', { password: PASSWORD }, cookie);
      expect(remove.status).toBe(200);
      expect(t.invalidatePublicProfiles).toHaveBeenCalledWith(['xyz']);
    });

    it('should purge the handle when profile details change', async () => {
      const t = createTestAuth({ canDeliver: false });
      const signUp = await t.signUp('ada@example.com', 'merlin');
      t.invalidatePublicProfiles.mockClear();
      await t.post('/update-user', { image: 'https://example.com/merlin.png' }, liveCookies(signUp.cookies));
      expect(t.invalidatePublicProfiles).toHaveBeenCalledWith(['merlin']);
    });
  });

  describe('one name per account', () => {
    const DAY = 24 * 60 * 60 * 1000;

    async function signedIn(username = 'Merlin') {
      const t = createTestAuth({ canDeliver: false });
      const signUp = await t.post('/sign-up/email', { name: 'Merlin Ambrosius', email: 'ada@example.com', password: PASSWORD, username, displayUsername: username });
      return { t, cookie: liveCookies(signUp.cookies), user: () => t.userByEmail('ada@example.com') };
    }

    it('should keep the Better Auth name a mirror of the username', async () => {
      const { t, cookie, user } = await signedIn();
      expect(user()).toMatchObject({ username: 'merlin', displayUsername: 'Merlin', name: 'Merlin' });
      expect(user()?.[USERNAME_CHANGED_AT_FIELD] ?? null).toBeNull();

      expect((await t.post('/update-user', { name: 'Someone Else' }, cookie)).status).toBe(200);
      expect(user()?.name).toBe('Merlin');
    });

    it('should allow one rename, then refuse further renames for 30 days', async () => {
      const { t, cookie, user } = await signedIn();
      expect((await t.post('/update-user', { username: 'morgana', displayUsername: 'Morgana' }, cookie)).status).toBe(200);
      expect(user()).toMatchObject({ username: 'morgana', displayUsername: 'Morgana', name: 'Morgana' });
      expect(user()?.[USERNAME_CHANGED_AT_FIELD]).toBeInstanceOf(Date);

      const again = await t.post('/update-user', { username: 'nimue', displayUsername: 'Nimue' }, cookie);
      expect(again.status).toBe(400);
      expect(again.body?.code).toBe(USERNAME_ERROR_CODES.CHANGE_TOO_SOON);
      expect(user()?.username).toBe('morgana');
      // The old name signs in nobody any more; the new one does.
      expect((await t.post('/sign-in/username', { username: 'merlin', password: PASSWORD })).status).toBe(401);
      expect((await t.post('/sign-in/username', { username: 'Morgana', password: PASSWORD })).status).toBe(200);
    });

    it('should allow casing changes during the cooldown without restarting it', async () => {
      const { t, cookie, user } = await signedIn();
      await t.post('/update-user', { username: 'morgana', displayUsername: 'Morgana' }, cookie);
      const changedAt = user()?.[USERNAME_CHANGED_AT_FIELD];

      expect((await t.post('/update-user', { username: 'MORGANA', displayUsername: 'MORGANA' }, cookie)).status).toBe(200);
      expect(user()).toMatchObject({ username: 'morgana', displayUsername: 'MORGANA', name: 'MORGANA', [USERNAME_CHANGED_AT_FIELD]: changedAt });
    });

    it('should allow the next rename once 30 days have passed', async () => {
      const { t, cookie, user } = await signedIn();
      t.patchUser('ada@example.com', { [USERNAME_CHANGED_AT_FIELD]: new Date(Date.now() - 31 * DAY) });
      expect((await t.post('/update-user', { username: 'nimue', displayUsername: 'Nimue' }, cookie)).status).toBe(200);
      expect(user()?.username).toBe('nimue');
    });

    it('should refuse a display casing that spells another name', async () => {
      const { t, cookie, user } = await signedIn();
      const result = await t.post('/update-user', { displayUsername: 'Morgana' }, cookie);
      expect(result.status).toBe(400);
      expect(result.body?.code).toBe(USERNAME_ERROR_CODES.DISPLAY_MISMATCH);
      expect(user()?.displayUsername).toBe('Merlin');
    });

    it('should not let the client set the rename time', async () => {
      const { t, cookie, user } = await signedIn();
      const result = await t.post('/update-user', { [USERNAME_CHANGED_AT_FIELD]: new Date(0).toISOString() }, cookie);
      expect(result.status).toBe(400);
      expect(user()?.[USERNAME_CHANGED_AT_FIELD] ?? null).toBeNull();
    });
  });
});
