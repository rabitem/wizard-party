import { describe, expect, it } from 'vitest';
import { CAMERA_CONFIG } from '@/presentation/config/layout.config';
import { SANDBOX_AUDIT } from '@/presentation/config/sandbox.config';
import { getCameraEnvelope } from '@/presentation/config/themed-environment.config';
import { TABLE_THEMES } from '../settings/visual-presets';
import { frameCamera } from './camera-framing';
import { getCameraTransitionMs, interpolateCameraPose, type CameraPose } from './camera-transition';
import { getTableFitPoints } from './table-fit-points';

const { MOBILE, TARGET, FRAMING } = CAMERA_CONFIG;
const FRAME_MS = 1000 / 60;
/** Portrait phones and a fold cover screen: the rooms' envelopes decide the framing there */
const NARROW_ASPECTS = [412 / 839, 344 / 882];

function roomFraming(tableThemeId: string, aspect: number): CameraPose {
  return frameCamera({
    presetPosition: MOBILE.POSITION,
    target: TARGET,
    fovDeg: MOBILE.FOV,
    aspect,
    fitPoints: getTableFitPoints(4),
    envelope: getCameraEnvelope(tableThemeId),
    tableCenterNdcY: FRAMING.PORTRAIT_RESERVE.BOTTOM - FRAMING.PORTRAIT_RESERVE.TOP,
  });
}

function distance(a: readonly number[], b: readonly number[]): number {
  return Math.hypot(...a.map((value, i) => value - b[i]));
}

/** Every switch the theme picker can make, on every narrow aspect, with the framings on both sides */
const SWITCHES = NARROW_ASPECTS.flatMap((aspect) =>
  TABLE_THEMES.flatMap((from) => TABLE_THEMES.map((to) => ({ from: roomFraming(from.id, aspect), to: roomFraming(to.id, aspect) }))));

describe('camera glide between room framings', () => {
  it('is needed: some room switches on a phone move the framed camera further than one frame may', () => {
    const cuts = SWITCHES.map(({ from, to }) => distance(from.position, to.position));
    expect(Math.max(...cuts)).toBeGreaterThan(SANDBOX_AUDIT.MAX_CAMERA_STEP);
  });

  it('glides there without moving the camera or its target further than the camera-jump audit allows in one 60 Hz frame', () => {
    for (const { from, to } of SWITCHES) {
      const durationMs = getCameraTransitionMs(from, to);
      let previous = from;
      for (let frame = 1; frame <= Math.ceil(durationMs / FRAME_MS); frame++) {
        const pose = interpolateCameraPose(from, to, (frame * FRAME_MS) / durationMs);
        expect(distance(pose.position, previous.position)).toBeLessThan(SANDBOX_AUDIT.MAX_CAMERA_STEP);
        expect(distance(pose.target, previous.target)).toBeLessThan(SANDBOX_AUDIT.MAX_CAMERA_STEP);
        previous = pose;
      }
      expect(previous).toEqual({ position: to.position, target: to.target, zoom: to.zoom });
    }
  });
});
