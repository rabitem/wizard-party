import { resolveAppVersion } from '../app-version';
import { VersionWatch, type VersionCheckScheduler } from './version-watch';
import { VERSION_WATCH_CONFIG } from './version-watch.config';

function isPageVisible(): boolean {
  return document.visibilityState === 'visible';
}

/** Ticks on an interval while the page is visible, and whenever it is shown again. */
const browserScheduler: VersionCheckScheduler = {
  start(tick) {
    const tickIfVisible = () => {
      if (isPageVisible()) tick();
    };
    const timer = setInterval(tickIfVisible, VERSION_WATCH_CONFIG.POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', tickIfVisible);
    window.addEventListener('pageshow', tickIfVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tickIfVisible);
      window.removeEventListener('pageshow', tickIfVisible);
    };
  },
};

async function fetchDeployedVersion(): Promise<string | null> {
  // A plain fetch is not pinned to this tab's deployment, so it reaches the current release.
  const response = await fetch(VERSION_WATCH_CONFIG.ENDPOINT, { cache: 'no-store' });
  if (!response.ok) return null;
  const body = (await response.json()) as { version?: unknown } | null;
  return typeof body?.version === 'string' ? body.version : null;
}

/** The tab's one version watch; it checks only while a view subscribes (never on the server). */
export const versionWatch = new VersionWatch({
  currentVersion: resolveAppVersion(),
  fetchDeployedVersion,
  scheduler: browserScheduler,
  now: () => Date.now(),
  minCheckGapMs: VERSION_WATCH_CONFIG.MIN_CHECK_GAP_MS,
});
