import { RENDER_PERFORMANCE_CONFIG as C } from '../client-telemetry.config';
import type { ClientTelemetryCollector } from '../client-telemetry';
import { FrameStatsAccumulator } from '../frame-stats';
import { getRenderQualitySnapshot } from '../render-quality-snapshot';

interface PerformanceMemory {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}

const toMb = (bytes: number) => Math.round(bytes / C.BYTES_PER_MB);

function readHeap(): { jsHeapUsedMb: number | null; jsHeapLimitMb: number | null } {
  const memory = (performance as Performance & { memory?: PerformanceMemory }).memory;
  if (!memory) return { jsHeapUsedMb: null, jsHeapLimitMb: null };
  return { jsHeapUsedMb: toMb(memory.usedJSHeapSize), jsHeapLimitMb: toMb(memory.jsHeapSizeLimit) };
}

function observeLongTasks(onTask: (durationMs: number) => void): () => void {
  if (typeof PerformanceObserver === 'undefined' || !PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
    return () => undefined;
  }
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) onTask(entry.duration);
  });
  observer.observe({ type: 'longtask' });
  return () => observer.disconnect();
}

/**
 * FPS / frame time summary per window while the game table is mounted. Uses its own cheap
 * requestAnimationFrame loop (one subtraction per frame) instead of hooking into the R3F render
 * loop, so it measures what the user sees without touching rendering code.
 */
export function createRenderPerformanceCollector(): ClientTelemetryCollector {
  return {
    name: 'render-performance',
    scope: 'game',
    start(sink) {
      const stats = new FrameStatsAccumulator();
      let longTasks = 0;
      let longTaskMs = 0;
      let lastFrameAt: number | null = null;
      let frameHandle = 0;
      let windowStartedAt = performance.now();

      const onFrame = (time: number) => {
        if (lastFrameAt !== null) stats.add(time - lastFrameAt);
        lastFrameAt = time;
        frameHandle = requestAnimationFrame(onFrame);
      };

      const resetWindow = () => {
        stats.reset();
        longTasks = 0;
        longTaskMs = 0;
        windowStartedAt = performance.now();
      };

      const report = () => {
        const summary = stats.frames >= C.MIN_FRAMES_PER_WINDOW && !document.hidden ? stats.summarize() : null;
        if (summary) {
          const quality = getRenderQualitySnapshot();
          sink.track('render.performance', {
            qualityTier: quality?.tier ?? null,
            renderDpr: quality?.dpr ?? null,
            windowMs: Math.round(performance.now() - windowStartedAt),
            ...summary,
            longTasks,
            longTaskMs: Math.round(longTaskMs),
            ...readHeap(),
          });
        }
        resetWindow();
      };

      // A hidden tab pauses rAF; the gap is a pause, not a slow frame, and the window is partial.
      const onVisibilityChange = () => {
        lastFrameAt = null;
        resetWindow();
      };

      const stopLongTasks = observeLongTasks((durationMs) => {
        longTasks++;
        longTaskMs += durationMs;
      });
      const interval = window.setInterval(report, C.WINDOW_MS);
      document.addEventListener('visibilitychange', onVisibilityChange);
      frameHandle = requestAnimationFrame(onFrame);

      return () => {
        cancelAnimationFrame(frameHandle);
        window.clearInterval(interval);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        stopLongTasks();
      };
    },
  };
}
