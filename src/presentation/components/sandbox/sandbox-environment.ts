import { formFactorOf } from '../../config/sandbox.config';
import type { AnimationAuditRecorder } from './animation-audit-recorder';
import type { SandboxProfile } from './sandbox-profile';
import type { RunEnvironment } from './sandbox-report.types';
import { detectWebGlEnvironment, isWebGlFailure } from './webgl-environment';

function hasTouchInput(): boolean {
  return window.matchMedia?.('(pointer: coarse)').matches === true || navigator.maxTouchPoints > 0;
}

/** Where a run executed: browser, input, form factor, instrumentation profile and WebGL. */
export function describeRunEnvironment(profile: SandboxProfile): RunEnvironment {
  const touch = hasTouchInput();
  return {
    userAgent: navigator.userAgent,
    devicePixelRatio: window.devicePixelRatio,
    touch,
    formFactor: formFactorOf(window.innerWidth, window.innerHeight, touch),
    profile: profile.name,
    probeStride: profile.probeStride,
    webgl: detectWebGlEnvironment(),
  };
}

/** Notes environment facts that change how a report reads (software rendering). */
export function flagEnvironment(recorder: AnimationAuditRecorder, t: number, environment: RunEnvironment): void {
  if (!environment.webgl.software) return;
  recorder.flag(t, 'software-renderer', `WebGL renders in software (${environment.webgl.renderer}); frame times are not representative`, 'webgl', {
    renderer: environment.webgl.renderer,
  });
}

/**
 * The scene never became ready. A renderer that could not start (no WebGL, a GL error while
 * creating it) is reported as such, with its errors, instead of as a generic readiness timeout.
 */
export function flagNotReady(
  recorder: AnimationAuditRecorder,
  t: number,
  environment: RunEnvironment,
  state: Record<string, unknown>
): void {
  const glErrors = recorder.anomalyList()
    .filter((anomaly) => (anomaly.code === 'console-error' || anomaly.code === 'page-error') && isWebGlFailure(anomaly.message))
    .map((anomaly) => anomaly.message);
  const { webgl } = environment;
  if (!webgl.webgl1 || glErrors.length > 0) {
    const reason = webgl.webgl1 ? `the renderer failed to start: ${glErrors[0]}` : 'this browser offers no WebGL context';
    recorder.flag(t, 'webgl-unavailable', `The table never rendered: ${reason}`, 'webgl', { webgl, errors: glErrors.slice(0, 3), ...state });
    return;
  }
  recorder.flag(t, 'wait-timeout', 'The game never connected and rendered', 'ready', state);
}
