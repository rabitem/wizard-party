import { OCCLUSION_PROBE, PLAYABILITY_BUDGETS } from '../../config/sandbox-budgets.config';
import type { SandboxFormFactor } from '../../config/sandbox.config';
import type { AnimationAuditRecorder } from './animation-audit-recorder';
import { round } from './audit-log';
import { collectControls, collectHudRegions, type HudRegion } from './hud-regions';
import { auditLayout } from './layout-audit';
import { buildSceneScreenModel, type SceneScreenModel } from './scene-screen-model';
import { exposedTapWidth, sceneHandCards } from './hand-hit-test';
import { coverFraction, outsideFraction, overlaps, roundRect, type ScreenRect } from './screen-geometry';
import type { SandboxSceneBridge } from './scene-bridge';
import type { SandboxGameHandles } from './sandbox.types';

export interface ScreenInput {
  touch: boolean;
  formFactor: SandboxFormFactor;
}

export interface ScreenAuditContext {
  recorder: AnimationAuditRecorder;
  t: number;
  label: string;
  handles: SandboxGameHandles | null;
  bridge: SandboxSceneBridge | null;
  input: ScreenInput;
}

const HAND_PHASES = new Set(['BIDDING', 'PLAYING', 'TRUMP_SELECTION']);
const LIST_LIMIT = 5;

function flagHand(context: ScreenAuditContext, model: SceneScreenModel): void {
  const { recorder, t, label, handles, input, bridge } = context;
  if (!bridge || !handles || !HAND_PHASES.has(handles.phase ?? '') || handles.handAnimation !== 'none' || model.hand.length === 0) return;

  const viewport = { width: window.innerWidth, height: window.innerHeight };
  // What a finger can select: the scene is hit-tested, so rows, arcs and overlaps all count.
  const cards = sceneHandCards(bridge);
  const widths = model.hand.map((card) => exposedTapWidth(bridge, card.cardId, card.rect, cards));
  const minimum = input.touch ? PLAYABILITY_BUDGETS.MIN_HAND_CARD_TAP_PX.touch : PLAYABILITY_BUDGETS.MIN_HAND_CARD_TAP_PX.pointer;
  const narrow = widths.filter((width) => width < minimum);
  if (narrow.length > 0) {
    recorder.flag(t, 'tap-target-small', `${narrow.length} of ${widths.length} hand cards expose less than ${minimum}px to a ${input.touch ? 'finger' : 'pointer'} (narrowest ${round(Math.min(...widths), 1)}px) at ${label}`, `${label}:hand`, {
      widths: widths.map((width) => round(width, 1)),
    });
  }

  const hidden = model.hand.filter((card) => outsideFraction(card.rect, viewport) > PLAYABILITY_BUDGETS.HAND_MAX_HIDDEN_FRACTION);
  if (hidden.length > 0) {
    recorder.flag(t, 'hand-offscreen', `${hidden.length} hand card(s) lie partly outside the viewport at ${label}`, `${label}:hand`, {
      cards: hidden.slice(0, LIST_LIMIT).map((card) => ({ cardId: card.cardId, rect: roundRect(card.rect) })),
    });
  }

  // While the player reads the hand (bidding, their own turn), the cards they can act on must be solid.
  const reading = handles.phase === 'BIDDING' || (handles.phase === 'PLAYING' && handles.isLocalTurn);
  const judged = handles.phase === 'BIDDING' ? model.hand : model.hand.filter((card) => handles.playableCardIds.includes(card.cardId));
  const faded = reading ? judged.filter((card) => card.opacity < PLAYABILITY_BUDGETS.HAND_MIN_OPACITY_WHILE_READING) : [];
  if (faded.length > 0) {
    recorder.flag(t, 'hand-translucent', `${faded.length} hand card(s) the player must read are translucent (opacity ${round(Math.min(...faded.map((card) => card.opacity)), 2)}) at ${label}`, `${label}:hand`, {
      cards: faded.slice(0, LIST_LIMIT).map((card) => card.cardId),
    });
  }
}

function flagTexts(context: ScreenAuditContext, model: SceneScreenModel): void {
  const minimum = PLAYABILITY_BUDGETS.MIN_SCENE_TEXT_PX[context.input.formFactor];
  const small = model.texts.filter((text) => text.emPx < minimum);
  if (small.length === 0) return;
  context.recorder.flag(context.t, 'scene-text-unreadable', `${small.length} 3D label(s) render below ${minimum}px on a ${context.input.formFactor} at ${context.label}`, `${context.label}:text`, {
    labels: small.slice(0, LIST_LIMIT).map((text) => ({ text: text.text, px: round(text.emPx, 1) })),
  });
}

/** What the HUD may not cover: cards on the table, 3D labels and the tap strips of the hand. */
function sceneTargets(model: SceneScreenModel): Array<{ name: string; rect: ScreenRect; limit: number }> {
  return [
    ...model.played.map((card) => ({ name: `played ${card.cardId}`, rect: card.rect, limit: PLAYABILITY_BUDGETS.SCENE_COVER_MAX_FRACTION })),
    ...model.texts.flatMap((text) => (text.rect ? [{ name: `label "${text.text}"`, rect: text.rect, limit: PLAYABILITY_BUDGETS.SCENE_COVER_MAX_FRACTION }] : [])),
    ...model.hand.map((card) => ({ name: `hand ${card.cardId}`, rect: card.rect, limit: PLAYABILITY_BUDGETS.HAND_COVER_MAX_FRACTION })),
  ];
}

function flagHudOverlaps(context: ScreenAuditContext, regions: HudRegion[]): void {
  const { recorder, t, label } = context;
  const tolerance = PLAYABILITY_BUDGETS.OVERLAP_TOLERANCE_PX;
  regions.forEach((a, index) => {
    for (const b of regions.slice(index + 1)) {
      if (!overlaps(a.rect, b.rect, tolerance)) continue;
      recorder.flag(t, 'hud-overlap', `${a.name} overlaps ${b.name} at ${label}`, `${label}:${a.name}|${b.name}`, { a: roundRect(a.rect), b: roundRect(b.rect) });
    }
  });

  const controls = collectControls();
  controls.forEach((a, index) => {
    for (const b of controls.slice(index + 1)) {
      if (a.element.contains(b.element) || b.element.contains(a.element) || !overlaps(a.rect, b.rect, tolerance)) continue;
      recorder.flag(t, 'hud-overlap', `Control ${a.name} overlaps control ${b.name} at ${label}`, `${label}:${a.name}|${b.name}`, { a: roundRect(a.rect), b: roundRect(b.rect) });
    }
  });
}

function flagHudOverScene(context: ScreenAuditContext, regions: HudRegion[], model: SceneScreenModel): void {
  const targets = sceneTargets(model);
  for (const region of regions) {
    const covered = targets.filter((target) => coverFraction(target.rect, region.rect) > target.limit);
    if (covered.length === 0) continue;
    context.recorder.flag(context.t, 'hud-occludes-scene', `${region.name} covers ${covered.slice(0, LIST_LIMIT).map((target) => target.name).join(', ')} at ${context.label}`, `${context.label}:${region.name}`, {
      region: roundRect(region.rect),
      covered: covered.length,
    });
  }
}

function flagRenderState(context: ScreenAuditContext, model: SceneScreenModel): void {
  const { recorder, t, label } = context;
  const { occlusion } = model;
  if (occlusion.rays > 0 && occlusion.blocked / occlusion.rays > OCCLUSION_PROBE.MAX_BLOCKED_FRACTION) {
    recorder.flag(t, 'scene-occluded', `${occlusion.blocked} of ${occlusion.rays} sight lines from the camera to the table are blocked at ${label}`, `${label}:table`, {
      occluders: occlusion.occluders.slice(0, LIST_LIMIT),
    });
  }
  if (model.squareParticles.length > 0) {
    recorder.flag(t, 'square-particles', `${model.squareParticles.length} particle system(s) draw untextured square points`, model.squareParticles[0], {
      systems: model.squareParticles.slice(0, LIST_LIMIT),
    });
  }
}

/**
 * Everything a player needs to see and touch, checked on the frame on screen now: page layout,
 * hand tap targets and placement, legibility of 3D labels, HUD panels overlapping each other or
 * the cards and labels, sight lines from the camera to the table, and render states that make
 * the scene look broken. Thresholds live in PLAYABILITY_BUDGETS.
 */
export function auditScreen(context: ScreenAuditContext): void {
  auditLayout(context.recorder, context.t, context.label);
  if (!context.bridge) return;
  const model = buildSceneScreenModel(context.bridge);
  const regions = collectHudRegions(context.bridge.canvas);
  flagHand(context, model);
  flagTexts(context, model);
  flagHudOverlaps(context, regions);
  flagHudOverScene(context, regions, model);
  flagRenderState(context, model);
}
