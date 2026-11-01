import { SANDBOX_AUDIT } from '../../config/sandbox.config';
import type { AnimationAuditRecorder } from './animation-audit-recorder';
import type { SandboxGameHandles, SandboxServer, WaitCondition } from './sandbox.types';

export interface WaitConditionContext {
  handles: () => SandboxGameHandles | null;
  server: () => SandboxServer | null;
  recorder: () => AnimationAuditRecorder | null;
  isIdle: () => boolean;
  collectCompletions: () => number;
  landedCompletions: () => number;
  /** True once a new connection was opened after the last simulated drop. */
  reconnected: () => boolean;
}

/**
 * True when the real UI would accept a card from the local player: their turn, a playable
 * card, and no trick result or trick animation locking input (GameClientUI interactionsDisabled).
 */
export function canPlayLocally(handles: SandboxGameHandles | null): boolean {
  return !!handles && handles.phase === 'PLAYING' && handles.isLocalTurn && handles.playableCardIds.length > 0 &&
    !handles.trickResult && !handles.pendingTrickResult && !handles.isTrickAnimating;
}

/** The client is connected, in a phase, and the scene draws every card of the hand. */
export function isSandboxReady(handles: SandboxGameHandles | null, recorder: AnimationAuditRecorder | null, sceneMounted: boolean): boolean {
  return !!handles && !!recorder && handles.isConnected && handles.phase !== null && sceneMounted &&
    recorder.countPresent('hand-card') === handles.localHand.length;
}

/** Nothing in flight: no queued server messages, bot turns, trick animations or moving cards. */
export function isSandboxIdle(handles: SandboxGameHandles | null, server: SandboxServer | null, recorder: AnimationAuditRecorder | null): boolean {
  if (!handles || !server) return false;
  return !server.hasPendingDeliveries &&
    !server.isBotTurnScheduled &&
    !handles.trickResult &&
    !handles.pendingTrickResult &&
    !handles.isTrickAnimating &&
    handles.queuedPlayedCards === 0 &&
    handles.handAnimation === 'none' &&
    !(recorder?.isAnimationInFlight() ?? false);
}

/**
 * Builds the predicate for a wait-for step. Event-counting conditions take their baseline
 * when the step starts, so they wait for the next occurrence rather than a past one.
 */
export function createWaitCondition(until: WaitCondition, context: WaitConditionContext): () => boolean {
  const collectBaseline = context.collectCompletions();
  const landedBaseline = context.landedCompletions();
  const phase = () => context.handles()?.phase ?? null;

  switch (until) {
    case 'local-turn': return () => canPlayLocally(context.handles());
    case 'all-landed': return () => context.landedCompletions() > landedBaseline;
    case 'collecting': return () => (context.recorder()?.countPresent('collecting-card') ?? 0) > 0;
    case 'trick-collected': return () => context.collectCompletions() > collectBaseline;
    case 'idle': {
      // One idle instant can fall between two bot plays; idle means idle for a run of frames.
      let idleFrames = 0;
      return () => {
        idleFrames = context.isIdle() ? idleFrames + 1 : 0;
        return idleFrames >= SANDBOX_AUDIT.SETTLED_IDLE_FRAMES;
      };
    }
    case 'hand-idle': return () => context.handles()?.handAnimation === 'none';
    case 'connected':
      return () => {
        const handles = context.handles();
        return context.reconnected() && !!handles?.isConnected && !!context.server()?.isConnected && handles.phase !== null;
      };
    case 'round-end': return () => phase() === 'ROUND_END' || phase() === 'GAME_END';
    case 'bidding': return () => phase() === 'BIDDING' && !!context.handles()?.isLocalTurn;
    case 'playing': return () => phase() === 'PLAYING';
  }
}
