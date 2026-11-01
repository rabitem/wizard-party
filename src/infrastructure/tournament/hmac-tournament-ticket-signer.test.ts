import { describe, expect, it } from 'vitest';

import { isTournamentError } from '@shared/domain/tournament';
import { signMatchTicket, type MatchTicketClaims } from '@shared/tournament';

import { HmacTournamentTicketSigner } from './hmac-tournament-ticket-signer';

const claims = { v: 1, tid: 'abcdefghjk23', mid: 'abcdefghjk23-1-1', uid: 'u01', name: 'Ada', exp: 1 } as unknown as MatchTicketClaims;

describe('HmacTournamentTicketSigner', () => {
  describe('sign', () => {
    it('should sign with the configured secret, exactly like the shared codec', async () => {
      const signer = new HmacTournamentTicketSigner(() => 'test-secret');
      await expect(signer.sign(claims)).resolves.toBe(await signMatchTicket('test-secret', claims));
    });

    it('should read the secret on every ticket (rotation without restart)', async () => {
      let secret = 'first';
      const signer = new HmacTournamentTicketSigner(() => secret);
      const before = await signer.sign(claims);
      secret = 'second';
      expect(await signer.sign(claims)).not.toBe(before);
    });

    it('should answer unavailable without a secret', async () => {
      const error = await new HmacTournamentTicketSigner(() => null).sign(claims).catch((caught: unknown) => caught);
      expect(isTournamentError(error, 'unavailable')).toBe(true);
    });
  });
});
