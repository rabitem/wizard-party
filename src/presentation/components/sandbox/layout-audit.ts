import type { AnimationAuditRecorder } from './animation-audit-recorder';
import { collectControls } from './hud-regions';
import { roundRect } from './screen-geometry';

export { SANDBOX_UI_ATTRIBUTE } from './hud-regions';

const EDGE_SLACK_PX = 1;

/** Flags page-level scrolling and game controls that render outside the viewport. */
export function auditLayout(recorder: AnimationAuditRecorder, t: number, label: string): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const root = document.documentElement;

  if (root.scrollWidth > width + EDGE_SLACK_PX || root.scrollHeight > height + EDGE_SLACK_PX) {
    recorder.flag(t, 'page-overflow', `Page scrolls (${root.scrollWidth}x${root.scrollHeight} in a ${width}x${height} viewport) at ${label}`, label);
  }

  for (const { name, rect } of collectControls()) {
    const outside = rect.left < -EDGE_SLACK_PX || rect.top < -EDGE_SLACK_PX ||
      rect.right > width + EDGE_SLACK_PX || rect.bottom > height + EDGE_SLACK_PX;
    if (!outside) continue;
    recorder.flag(t, 'hud-offscreen', `${name} renders outside the ${width}x${height} viewport at ${label}`, `${label}:${name}`, {
      rect: roundRect(rect),
    });
  }
}
