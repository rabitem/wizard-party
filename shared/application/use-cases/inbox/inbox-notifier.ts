import { inboxDedupeKey, inboxExpiry, type InboxAction, type InboxDelivery, type InboxKind } from '../../../domain/social';
import type { IClock } from '../../ports/account';
import type { IInboxRepository } from '../../ports/social';

/**
 * The one way other features put something into a player's inbox. Applies the kind's dedupe key
 * and expiry, so callers only state what happened.
 */
export class InboxNotifier {
  constructor(
    private readonly inbox: IInboxRepository,
    private readonly clock: IClock
  ) {}

  async deliver(delivery: InboxDelivery): Promise<string> {
    const at = this.clock.now();
    const dedupeKey = inboxDedupeKey(delivery.kind, delivery.actorId, delivery.payload);
    return this.inbox.deliver({ delivery, dedupeKey, expiresAt: inboxExpiry(delivery.kind, at), at });
  }

  /**
   * Closes the open item of this kind from this actor, e.g. a request that was cancelled. Kinds that
   * key on their payload (tournament items) need the payload's key fields to be found.
   */
  async withdraw(userId: string, kind: InboxKind, actorId: string | null, resolution: InboxAction | 'cancelled', payload?: unknown): Promise<void> {
    const key = inboxDedupeKey(kind, actorId, payload);
    if (key) await this.inbox.resolveByKey(userId, key, resolution, this.clock.now());
  }
}
