import { SANDBOX_AUDIT } from '../../config/sandbox.config';
import { SANDBOX_DEFAULT_TRUMP_SUIT } from './sandbox-autoplayer';
import { createCaptureSteps, type CaptureStepContext } from './sandbox-capture-steps';
import { resolveSettingsPatch } from './sandbox-dimensions';
import { createFaultSteps, type FaultStepContext } from './sandbox-fault-steps';
import { applySettings, currentSandboxSettings, describeStep, selectPlayableCard } from './sandbox-run-support';
import { nextFrame, type StepHandlerMap } from './sandbox-step-handlers';
import { getSandboxSceneBridge } from './scene-bridge';
import { doubleTap, performGesture, resolvePointerKind } from './synthetic-pointer';
import type { CardSelector, PlayMethod, PointerKind, SandboxGameHandles, SandboxServer, SandboxStep, WaitCondition } from './sandbox.types';

export interface StepRunnerContext extends CaptureStepContext, FaultStepContext {
  waitFor: (until: WaitCondition, timeoutMs?: number) => Promise<void>;
  setAutoplay: (enabled: boolean) => void;
  onStep: (label: string) => void;
}

/** Gestures after which the card stays in the hand (the play was called off). */
const NON_PLAYING_GESTURES: ReadonlySet<PlayMethod> = new Set(['drag-cancel', 'drag-interrupt', 'drag-second-finger']);

/** Executes scenario steps against the running game through the same handlers the real UI uses. */
export class SandboxStepRunner {
  private readonly handlers: StepHandlerMap;

  constructor(private readonly context: StepRunnerContext) {
    this.handlers = { ...this.coreSteps(), ...createCaptureSteps(context), ...createFaultSteps(context) };
  }

  async run(steps: SandboxStep[]): Promise<void> {
    for (const step of steps) {
      if (step.op === 'repeat') {
        for (let index = 0; index < step.times; index++) await this.run(step.steps);
        continue;
      }
      const label = describeStep(step);
      this.context.onStep(label);
      this.context.recorder()?.log(this.context.clock.now(), 'step', label);
      const handler = this.handlers[step.op] as (step: SandboxStep) => Promise<void> | void;
      await handler(step);
    }
  }

  private readonly nextFrame = (): Promise<void> => nextFrame(this.context.clock);

  private requireHandles(): SandboxGameHandles {
    const handles = this.context.handles();
    if (!handles) throw new Error('Game view is not mounted');
    return handles;
  }

  /** Calls a game handler, then lets one frame render its effect. */
  private act(action: (handles: SandboxGameHandles) => void): Promise<void> {
    action(this.requireHandles());
    return this.nextFrame();
  }

  private server(): SandboxServer | null {
    return this.context.server();
  }

  private coreSteps(): Omit<StepHandlerMap, keyof ReturnType<typeof createCaptureSteps> | keyof ReturnType<typeof createFaultSteps>> {
    const { context } = this;
    return {
      play: (step) => this.play(step.card, step.via ?? 'double-tap', step.pointer ?? 'auto'),
      bots: (step) => this.server()?.setBotPacing({ mode: step.mode, ...(step.delayMs !== undefined ? { delayMs: step.delayMs } : {}) }),
      autoplay: (step) => context.setAutoplay(step.enabled),
      'bot-play': (step) => this.playBots(step.count ?? 1),
      wait: (step) => context.clock.advance(step.ms),
      'wait-for': (step) => context.waitFor(step.until, step.timeoutMs),
      shuffle: () => this.act((handles) => handles.shuffle()),
      sort: () => this.act((handles) => handles.sort()),
      network: (step) => this.server()?.setNetwork({
        ...(step.latencyMs !== undefined ? { latencyMs: step.latencyMs } : {}),
        ...(step.jitterMs !== undefined ? { jitterMs: step.jitterMs } : {}),
      }),
      stall: (step) => this.server()?.stall(step.ms),
      'drop-connection': () => {
        context.markConnectionDrop();
        this.server()?.dropConnection();
        return this.nextFrame();
      },
      settings: (step) => {
        applySettings(resolveSettingsPatch(currentSandboxSettings(), step.patch));
        return this.nextFrame();
      },
      bid: (step) => this.act((handles) => handles.placeBid(step.bid ?? (handles.forbiddenBid === 0 ? 1 : 0))),
      'select-trump': (step) => this.act((handles) => handles.selectTrump(step.suit ?? SANDBOX_DEFAULT_TRUMP_SUIT)),
      'next-round': () => this.act((handles) => handles.nextRound()),
      checkpoint: async (step) => {
        // Judge a drawn frame: an idle demand loop may not have laid out what mounted last
        // (screen-sized labels take their scale in the frame that draws them).
        getSandboxSceneBridge()?.requestFrame();
        await this.nextFrame();
        context.auditScreen(step.label);
      },
    };
  }

  private playBots(count: number): void {
    for (let index = 0; index < count; index++) {
      if (!this.server()?.playBot()) return;
    }
  }

  private async play(selector: CardSelector | undefined, via: PlayMethod, pointer: PointerKind): Promise<void> {
    const { clock } = this.context;
    const handles = this.requireHandles();
    const cardId = selectPlayableCard(handles, selector, clock.stats().frame);
    this.context.recorder()?.log(clock.now(), 'step', 'local-play', { cardId, via, pointer: resolvePointerKind(pointer) });
    this.context.recorder()?.markLocalPlay(cardId);

    if (via === 'command') {
      handles.playCard(cardId);
    } else {
      await this.performPointerPlay(cardId, via, pointer);
      if (NON_PLAYING_GESTURES.has(via)) return this.expectStillInHand(cardId, via);
    }

    // Like a player, the next step starts once the card has left the hand (the server accepted it).
    const played = await clock.waitUntil(() => !this.context.handles()?.localHand.some((card) => card.id === cardId), SANDBOX_AUDIT.PLAY_ACK_TIMEOUT_MS);
    if (!played) throw new Error(`${via} on ${cardId} did not play the card`);
  }

  /** A called-off gesture must leave the card in the hand, whatever the extra pointers did. */
  private async expectStillInHand(cardId: string, via: PlayMethod): Promise<void> {
    for (let frame = 0; frame < SANDBOX_AUDIT.GESTURE_READY_FRAMES; frame++) await this.nextFrame();
    if (!this.context.handles()?.localHand.some((card) => card.id === cardId)) {
      throw new Error(`${via} on ${cardId} played the card although the gesture was called off`);
    }
  }

  /**
   * The DOM learns about a turn before the R3F tree commits it, so a gesture waits until the
   * hand card is interactive (no drag in progress, card visible) and the scene has drawn a few frames.
   */
  private async performPointerPlay(cardId: string, via: Exclude<PlayMethod, 'command'>, pointer: PointerKind): Promise<void> {
    const { clock } = this.context;
    const bridge = getSandboxSceneBridge();
    if (!bridge) throw new Error('Scene is not mounted');
    const interactive = () => (this.context.recorder()?.countPresent('dragged-card') ?? 0) === 0 &&
      bridge.findObject('hand-card', cardId)?.visible === true;
    if (!(await clock.waitUntil(interactive, SANDBOX_AUDIT.PLAY_ACK_TIMEOUT_MS))) throw new Error(`Hand card ${cardId} never became interactive`);
    for (let frame = 0; frame < SANDBOX_AUDIT.GESTURE_READY_FRAMES; frame++) await this.nextFrame();

    const kind = resolvePointerKind(pointer);
    const performed = via === 'double-tap'
      ? await doubleTap(bridge, cardId, kind, { nextFrame: this.nextFrame, pause: () => clock.advance(SANDBOX_AUDIT.DOUBLE_TAP_GAP_MS) })
      : await performGesture(bridge, cardId, via, kind, this.nextFrame);
    if (!performed) throw new Error(`Hand card ${cardId} is not in the scene`);
  }
}
