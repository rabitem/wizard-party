'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { GameProvider, useGame } from '../../providers/GameProvider';
import { SceneProbeProvider } from '../three/scene-probe-slot';
import { SandboxController, type SandboxMount } from './sandbox-controller';
import { installSandboxAgentApi } from './sandbox-agent-api';
import { SceneAnimationProbe } from './SceneAnimationProbe';
import { SandboxControlPanel } from './SandboxControlPanel';
import type { SandboxClock, SandboxServerFactory } from './sandbox.types';

const SANDBOX_HOST = 'sandbox.local';
const SANDBOX_PLAYER_NAME = 'You';

/** Joins the loopback room once the provider for this run is mounted. */
function SandboxAutoConnect({ roomId }: { roomId: string }) {
  const { connect } = useGame();
  useEffect(() => {
    connect(SANDBOX_HOST, roomId, SANDBOX_PLAYER_NAME);
    // connect identity changes with connection state; join exactly once per mounted run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);
  return null;
}

interface AnimationSandboxProps {
  clock: SandboxClock;
  createServer: SandboxServerFactory;
  /** Renders the real game client; the composition root supplies it (it lives in the app layer). */
  renderGame: (props: { roomId: string; controller: SandboxController }) => ReactNode;
  showControls: boolean;
}

/**
 * The animation sandbox: the production game client wired to an in-browser loopback
 * server, a per-frame scene probe and a scripted scenario runner. Each run mounts a
 * fresh GameProvider so no state leaks between runs.
 */
export function AnimationSandbox({ clock, createServer, renderGame, showControls }: AnimationSandboxProps) {
  const [mount, setMount] = useState<SandboxMount | null>(null);
  const [controller] = useState(() => new SandboxController(clock, createServer, setMount));

  useEffect(() => installSandboxAgentApi(controller, clock), [controller, clock]);
  useEffect(() => () => controller.stop(), [controller]);

  const probe = useMemo(
    () => (
      <SceneAnimationProbe
        onFrame={(samples, render) => controller.recordFrame(samples, render)}
        onSceneUnmount={() => controller.sceneUnmounted()}
        realNow={() => clock.realNow()}
        sampleStride={controller.profile.probeStride}
      />
    ),
    [controller, clock]
  );

  return (
    <SceneProbeProvider probe={probe}>
      <div className="relative h-dvh w-full overflow-hidden bg-[#030308]">
        {mount ? (
          <GameProvider key={mount.key} socketFactory={mount.socketFactory} manageNavigation={false}>
            <SandboxAutoConnect roomId={mount.roomId} />
            {renderGame({ roomId: mount.roomId, controller })}
          </GameProvider>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-amber-100/60">
            Pick a scenario and press Run to start the table.
          </div>
        )}
        {showControls ? <SandboxControlPanel controller={controller} clock={clock} /> : null}
      </div>
    </SceneProbeProvider>
  );
}
