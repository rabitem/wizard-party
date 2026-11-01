'use client';

import { LoopbackGameServer } from '@/infrastructure/sandbox/loopback-game-server';
import { RealClock } from '@/infrastructure/sandbox/real-clock';
import { sandboxClock, type ClockMode } from '@/infrastructure/sandbox/virtual-clock';
import { AnimationSandbox, type SandboxServerFactory } from '@/presentation/components/sandbox';
import { SandboxGameView } from './SandboxGameView';

const CLOCK_MODES: readonly ClockMode[] = ['play', 'paused', 'fast'];
type ClockParam = ClockMode | 'real';

function readParams() {
  const params = new URLSearchParams(window.location.search);
  const clockParam = params.get('clock') as ClockParam | null;
  return {
    clockMode: clockParam === 'real' || (clockParam && CLOCK_MODES.includes(clockParam)) ? clockParam : 'play',
    showControls: params.get('ui') !== '0',
  };
}

// Composition root. The clock must be installed before any game module schedules
// timers or frames, so it happens when this chunk is evaluated, ahead of the first render.
const params = readParams();
// clock=real measures what the browser really achieves (frame rate, frame times); every other
// mode runs the deterministic virtual clock used for correctness audits.
const clock = params.clockMode === 'real' ? new RealClock() : sandboxClock;
clock.install();
if (params.clockMode !== 'real') sandboxClock.setMode(params.clockMode);

const createServer: SandboxServerFactory = (options) => new LoopbackGameServer(options);

export function SandboxApp() {
  return (
    <AnimationSandbox
      clock={clock}
      createServer={createServer}
      showControls={params.showControls}
      renderGame={({ roomId, controller }) => <SandboxGameView roomId={roomId} controller={controller} />}
    />
  );
}
