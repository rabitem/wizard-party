import { takeDrawBreakdown, type DrawBreakdownEntry } from './draw-breakdown';
import { getSandboxDimensions, type SandboxDimensions } from './sandbox-dimensions';
import { getSandboxSceneBridge } from './scene-bridge';
import { cardClientPoint, tableCentrePoint } from './synthetic-pointer';
import type { SandboxController, SandboxStatusSnapshot } from './sandbox-controller';
import type { AuditReport, SandboxClock, SandboxRunConfig } from './sandbox.types';

interface ClientPoint {
  x: number;
  y: number;
}

/**
 * window.__wizardSandbox: the contract for agents and the batch audit runner.
 * Everything is JSON-serialisable so it can be driven over CDP / Playwright.
 */
export interface WizardSandboxApi {
  readonly version: 2;
  dimensions(): SandboxDimensions;
  run(config: SandboxRunConfig): Promise<AuditReport>;
  runMany(configs: SandboxRunConfig[]): Promise<AuditReport[]>;
  /** Includes `held`: the snapshot or external step the run waits on, if any. */
  status(): SandboxStatusSnapshot;
  /** Lets a held run continue (only a hold of `label`, when given). */
  release(label?: string): boolean;
  lastReport(): AuditReport | null;
  stop(): void;
  game(): Record<string, unknown> | null;
  /** Client (CSS px) centre of a hand card: the given one, or the first playable card. */
  handCardPoint(cardId?: string): { cardId: string; point: ClientPoint } | null;
  /** Client (CSS px) position of the table centre, where a throw aims. */
  tablePoint(): ClientPoint | null;
  clock: {
    mode(mode: 'play' | 'paused' | 'fast', speed?: number): void;
    step(frames?: number): Promise<void>;
    stats(): ReturnType<SandboxClock['stats']>;
  };
  /** PNG data URL of the next rendered frame (a paused clock is stepped one frame to draw it). */
  canvasSnapshot(): Promise<string | null>;
  /** Draw calls and shadow casters of the mounted scene per owner, biggest first (an estimate). */
  drawBreakdown(): DrawBreakdownEntry[];
}

declare global {
  interface Window {
    __wizardSandbox?: WizardSandboxApi;
  }
}

function handCardPoint(controller: SandboxController, cardId?: string): { cardId: string; point: ClientPoint } | null {
  const bridge = getSandboxSceneBridge();
  const handles = controller.getHandles();
  const id = cardId ?? handles?.localHand.find((card) => handles.playableCardIds.includes(card.id))?.id;
  if (!bridge || !id) return null;
  const point = cardClientPoint(bridge, id);
  return point ? { cardId: id, point } : null;
}

export function installSandboxAgentApi(controller: SandboxController, clock: SandboxClock): () => void {
  const api: WizardSandboxApi = {
    version: 2,
    dimensions: getSandboxDimensions,
    run: (config) => controller.run(config),
    async runMany(configs) {
      const reports: AuditReport[] = [];
      for (const config of configs) reports.push(await controller.run(config));
      return reports;
    },
    status: () => controller.getStatus(),
    release: (label) => controller.release(label),
    lastReport: () => controller.currentReport(),
    stop: () => controller.stop(),
    game() {
      const handles = controller.getHandles();
      if (!handles) return null;
      const { playCard: _play, shuffle: _shuffle, sort: _sort, placeBid: _bid, nextRound: _next, selectTrump: _trump, ...state } = handles;
      return state;
    },
    handCardPoint: (cardId) => handCardPoint(controller, cardId),
    tablePoint() {
      const bridge = getSandboxSceneBridge();
      return bridge ? tableCentrePoint(bridge) : null;
    },
    clock: {
      mode: (mode, speed) => clock.setMode(mode, speed),
      step: (frames = 1) => clock.step(frames),
      stats: () => clock.stats(),
    },
    drawBreakdown() {
      const bridge = getSandboxSceneBridge();
      return bridge ? takeDrawBreakdown(bridge.scene) : [];
    },
    async canvasSnapshot() {
      const bridge = getSandboxSceneBridge();
      if (!bridge) return null;
      const image = bridge.captureFrame();
      if (clock.stats().mode === 'paused') await clock.step(1);
      return image;
    },
  };
  window.__wizardSandbox = api;
  return () => {
    if (window.__wizardSandbox === api) delete window.__wizardSandbox;
  };
}
