import { describe, expect, it } from 'vitest';

import { usernameHooks } from './username-hooks';

type HookContext = Parameters<ReturnType<typeof usernameHooks>['create']['before']>[1];

/** Just enough of an endpoint context for the name lookups the hook makes. */
function contextWithNames(...taken: string[]): HookContext {
  const names = new Set(taken);
  const findOne = async ({ where }: { where: { value: unknown }[] }) => (names.has(String(where[0].value)) ? { id: 'someone' } : null);
  return { context: { adapter: { findOne } } } as unknown as HookContext;
}

const create = (user: Record<string, unknown>, context: HookContext) =>
  usernameHooks().create.before(user as Parameters<ReturnType<typeof usernameHooks>['create']['before']>[0], context);

describe('usernameHooks', () => {
  describe('create', () => {
    it('should generate a name from the provider name for a social sign-up', async () => {
      const result = await create({ email: 'jose@example.com', name: 'José García' }, contextWithNames());
      expect(result).toMatchObject({ data: { username: 'jose_garcia', displayUsername: 'Jose_Garcia', name: 'Jose_Garcia' } });
    });

    it('should add a suffix while the derived name is taken', async () => {
      const result = await create({ email: 'merlin@example.com', name: 'Merlin' }, contextWithNames('merlin'));
      expect(result).toMatchObject({ data: { displayUsername: expect.stringMatching(/^Merlin\d{4}$/) } });
    });

    it('should never use the email address for the public name', async () => {
      const result = await create({ email: 'john.smith1987@example.com', name: '' }, contextWithNames());
      expect(result).toMatchObject({ data: { displayUsername: expect.stringMatching(/^Player\d{4}$/) } });
    });
  });
});
