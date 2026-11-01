import { SOCIAL_LIMITS, canPerformInboxAction, inboxItemState, type InboxAction, type InboxItem, type InboxKind } from '../../../domain/social';
import type { IClock } from '../../ports/account';
import type { IInboxRepository, ISocialGraphRepository } from '../../ports/social';
import { SocialError } from '../friends/social-error';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireItemId(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new SocialError('invalid_input', 'invalid inbox item id');
  return value.toLowerCase();
}

export interface InboxPage {
  items: InboxItem[];
  nextCursor: string | null;
}

function encodeCursor(item: InboxItem): string {
  return `${item.createdAt}.${item.id}`;
}

function decodeCursor(value: unknown): { createdAt: number; id: string } | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const [time, id] = typeof value === 'string' ? value.split('.') : [];
  const createdAt = Number(time);
  if (!Number.isSafeInteger(createdAt) || !id || !UUID.test(id)) throw new SocialError('invalid_input', 'invalid cursor');
  return { createdAt, id };
}

export class ListInboxUseCase {
  constructor(private readonly inbox: IInboxRepository) {}

  async execute(userId: string, cursor?: unknown): Promise<InboxPage> {
    const limit = SOCIAL_LIMITS.INBOX_PAGE_SIZE;
    const items = await this.inbox.list(userId, { before: decodeCursor(cursor), limit: limit + 1 });
    const page = items.slice(0, limit);
    return { items: page, nextCursor: items.length > limit ? encodeCursor(page[page.length - 1]) : null };
  }
}

export class MarkInboxReadUseCase {
  constructor(
    private readonly inbox: IInboxRepository,
    private readonly clock: IClock
  ) {}

  async execute(userId: string, input: { ids?: unknown; all?: unknown }): Promise<{ updated: number }> {
    if (input.all === true) return { updated: await this.inbox.markRead(userId, 'all', this.clock.now()) };
    if (!Array.isArray(input.ids) || input.ids.length === 0 || input.ids.length > SOCIAL_LIMITS.INBOX_PAGE_SIZE) {
      throw new SocialError('invalid_input', 'pass ids (1-30) or all: true');
    }
    return { updated: await this.inbox.markRead(userId, input.ids.map(requireItemId), this.clock.now()) };
  }
}

export class DismissInboxItemUseCase {
  constructor(private readonly inbox: IInboxRepository) {}

  async execute(userId: string, id: unknown): Promise<void> {
    await this.inbox.remove(userId, requireItemId(id));
  }
}

/** What the client should do after an action, e.g. open the lobby of an accepted invite. */
export interface InboxActionResult {
  navigateTo?: string;
}

/** Side effect of acting on one kind of item. Handlers must be idempotent. */
export type InboxActionHandler = (userId: string, item: InboxItem, action: InboxAction) => Promise<InboxActionResult>;

/**
 * Generic inbox actions: validates that the item can take the action (state, expiry, kind), runs
 * the kind's handler and resolves the item. New actionable kinds only register a handler.
 */
export class PerformInboxActionUseCase {
  constructor(
    private readonly inbox: IInboxRepository,
    private readonly handlers: Partial<Record<InboxKind, InboxActionHandler>>,
    private readonly clock: IClock
  ) {}

  async execute(userId: string, idInput: unknown, actionInput: unknown): Promise<InboxActionResult> {
    const id = requireItemId(idInput);
    if (actionInput !== 'accept' && actionInput !== 'decline') throw new SocialError('invalid_input', 'action must be accept or decline');
    const action: InboxAction = actionInput;
    const item = await this.inbox.get(userId, id);
    if (!item) throw new SocialError('not_found', 'This notification no longer exists.');
    const now = this.clock.now();
    if (!canPerformInboxAction(item, action, now)) {
      const state = inboxItemState(item, now);
      throw new SocialError('conflict', state === 'expired' ? 'This invite has expired.' : 'This notification was already answered.');
    }
    const handler = this.handlers[item.kind];
    let result: InboxActionResult = {};
    try {
      if (handler) result = await handler(userId, item, action);
    } catch (error) {
      // The thing behind the item is gone (request withdrawn, player deleted): close the item.
      if (error instanceof SocialError && error.code === 'not_found') await this.inbox.resolve(userId, id, 'cancelled', now);
      throw error;
    }
    await this.inbox.resolve(userId, id, action, now);
    await this.inbox.markRead(userId, [id], now);
    return result;
  }
}

/**
 * Storage limitation (daily cron): inbox items after the retention period, declined friend requests
 * once their re-request cooldown is over.
 */
export class PruneSocialDataUseCase {
  constructor(
    private readonly inbox: IInboxRepository,
    private readonly graph: Pick<ISocialGraphRepository, 'pruneDeclined'>
  ) {}

  async execute(now: number): Promise<{ inboxItems: number; declinedRequests: number }> {
    const [inboxItems, declinedRequests] = await Promise.all([
      this.inbox.prune(now - SOCIAL_LIMITS.INBOX_RETENTION_DAYS * 24 * 60 * 60 * 1000),
      this.graph.pruneDeclined(now - SOCIAL_LIMITS.DECLINED_REQUEST_COOLDOWN_MS),
    ]);
    return { inboxItems, declinedRequests };
  }
}
