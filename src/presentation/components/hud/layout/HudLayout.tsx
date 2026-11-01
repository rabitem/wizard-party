'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import type { HudRegion, LayoutPolicy } from '@/presentation/types/hud-layout.types';
import { HudRegionsContext, type HudRegionNodes } from './hud-regions-context';
import { useHudInsetsPublisher } from './useHudInsetsPublisher';

const HUD_REGIONS: readonly HudRegion[] = [
  'status', 'prompt', 'actions', 'dock-left', 'dock-right', 'social', 'bottom', 'controls',
];

type RegionAttachers = Record<HudRegion, (node: HTMLDivElement | null) => void>;

/** Stable callback refs that record each region's DOM node. */
function useRegionNodes(): [HudRegionNodes, RegionAttachers] {
  const [nodes, setNodes] = useState<HudRegionNodes>({});
  const attachers = useMemo(() => {
    const entries = HUD_REGIONS.map((region) => [
      region,
      (node: HTMLDivElement | null) => {
        setNodes((previous) => {
          const next = node ?? undefined;
          return previous[region] === next ? previous : { ...previous, [region]: next };
        });
      },
    ] as const);
    return Object.fromEntries(entries) as RegionAttachers;
  }, []);
  return [nodes, attachers];
}

function Region({ name, attach }: { name: HudRegion; attach: RegionAttachers }) {
  return <div ref={attach[name]} className={`hud-region hud-region-${name}`} data-hud-region={name} />;
}

interface HudLayoutProps {
  policy: LayoutPolicy;
  children: ReactNode;
}

/**
 * The game HUD's region grid (see docs/client/hud-layout.md):
 *
 *   status  | prompt | actions        top bar (prompt moves to its own row on portrait phones)
 *   dock-l  | stage  | dock-r         side docks; the stage stays free for the table
 *   social  | bottom | controls       bottom bar
 *
 * Regions sit in separate grid cells, so HUD content placed with `HudSlot` cannot overlap.
 * The free stage rectangle is published as HUD insets for the camera framing.
 */
export function HudLayout({ policy, children }: HudLayoutProps) {
  const [nodes, attach] = useRegionNodes();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { promptBelowTopBar } = policy;
  useHudInsetsPublisher(rootRef, stageRef, `${policy.layoutClass}:${promptBelowTopBar}`);

  return (
    <HudRegionsContext.Provider value={nodes}>
      <div ref={rootRef} className="hud-layout" data-layout={policy.layoutClass} data-density={policy.density}>
        <div className="hud-row hud-row-top">
          <Region name="status" attach={attach} />
          {promptBelowTopBar ? <div aria-hidden /> : <Region name="prompt" attach={attach} />}
          <Region name="actions" attach={attach} />
        </div>
        {promptBelowTopBar ? <Region name="prompt" attach={attach} /> : null}
        <div className="hud-row hud-row-middle">
          <Region name="dock-left" attach={attach} />
          <div ref={stageRef} className="hud-stage" />
          <Region name="dock-right" attach={attach} />
        </div>
        <div className="hud-row hud-row-bottom">
          <Region name="social" attach={attach} />
          <Region name="bottom" attach={attach} />
          <Region name="controls" attach={attach} />
        </div>
      </div>
      {children}
    </HudRegionsContext.Provider>
  );
}
