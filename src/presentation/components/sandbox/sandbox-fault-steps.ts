import { SANDBOX_AUDIT, SANDBOX_FAULTS } from '../../config/sandbox.config';
import type { BrowserFaults } from './browser-faults';
import { getSandboxSceneBridge } from './scene-bridge';
import { socialEvent } from './sandbox-social';
import { nextFrame, type StepBaseContext, type StepHandlerMap } from './sandbox-step-handlers';
import type { SocketFaults } from './socket-faults';
import type { SandboxGameHandles, SandboxServer } from './sandbox.types';

export interface FaultStepContext extends StepBaseContext {
  handles: () => SandboxGameHandles | null;
  server: () => SandboxServer | null;
  socket: SocketFaults;
  browser: BrowserFaults;
  /** Starts a new baseline for the 'connected' wait condition. */
  markConnectionDrop: () => void;
  /** Frames drawn with at least one draw call since the run started. */
  drawnFrames: () => number;
}

type FaultOps = 'close-socket' | 'take-over-seat' | 'offline' | 'online' | 'state-burst' | 'storage-fault' | 'lose-context' | 'visibility' | 'social';

async function loseContext(context: FaultStepContext, restoreAfterMs: number): Promise<void> {
  const { clock } = context;
  const bridge = getSandboxSceneBridge();
  if (!bridge) throw new Error('Scene is not mounted');
  const restore = context.browser.loseContext(bridge.renderer.getContext());
  if (!restore) throw new Error('This browser cannot simulate a lost WebGL context (no WEBGL_lose_context)');
  await clock.advance(restoreAfterMs);
  const drawnBefore = context.drawnFrames();
  restore();
  const drawsAgain = await clock.waitUntil(() => context.drawnFrames() > drawnBefore, SANDBOX_AUDIT.CONTEXT_RESTORE_TIMEOUT_MS);
  if (!drawsAgain) {
    context.recorder()?.flag(clock.now(), 'context-not-restored', `The table drew nothing for ${SANDBOX_AUDIT.CONTEXT_RESTORE_TIMEOUT_MS}ms after the WebGL context was restored`, 'webgl-context');
  }
}

/**
 * Steps that put the client through what real networks, devices and other players do to it:
 * superseded and lost connections, offline periods, message storms, storage that throws,
 * GPU context loss, a backgrounded tab and bursts of social traffic.
 */
export function createFaultSteps(context: FaultStepContext): Pick<StepHandlerMap, FaultOps> {
  const { clock } = context;
  return {
    'close-socket': (step) => {
      context.markConnectionDrop();
      if (!context.socket.closeFromServer(step.code, step.reason ?? SANDBOX_FAULTS.SUPERSEDED_CLOSE_REASON)) {
        throw new Error('The client socket cannot be closed from the server side (not a loopback socket)');
      }
      return nextFrame(clock);
    },
    'take-over-seat': () => {
      const handles = context.handles();
      if (!handles) throw new Error('Game view is not mounted');
      handles.takeOverSeat();
      return nextFrame(clock);
    },
    offline: () => {
      context.markConnectionDrop();
      context.socket.setOffline(true);
      context.browser.setOnline(false);
      context.server()?.dropConnection();
      return nextFrame(clock);
    },
    online: () => {
      context.socket.setOffline(false);
      context.browser.setOnline(true);
      return nextFrame(clock);
    },
    'state-burst': (step) => {
      const server = context.server();
      for (let index = 0; index < step.count; index++) server?.broadcastState();
      return nextFrame(clock);
    },
    'storage-fault': (step) => {
      context.browser.setStorageFault(step.mode);
    },
    'lose-context': (step) => loseContext(context, step.restoreAfterMs ?? SANDBOX_FAULTS.CONTEXT_RESTORE_AFTER_MS),
    visibility: (step) => {
      context.browser.setVisibility(step.state);
      return nextFrame(clock);
    },
    async social(step) {
      const handles = context.handles();
      const server = context.server();
      if (!handles || !server) throw new Error('Game view is not mounted');
      const intervalMs = step.intervalMs ?? SANDBOX_FAULTS.SOCIAL_INTERVAL_MS;
      const target = { localPlayerId: server.localPlayerId, opponents: handles.opponents };
      for (let index = 0; index < step.count; index++) {
        const event = socialEvent(step.kind, index, target, Date.now());
        if (event) context.socket.inject([event]);
        if (intervalMs > 0) await clock.advance(intervalMs);
      }
      await nextFrame(clock);
    },
  };
}
