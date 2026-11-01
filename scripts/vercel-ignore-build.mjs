/**
 * Vercel's Ignored Build Step (`ignoreCommand` in vercel.json): exit 0 skips the deployment, exit 1
 * builds it. Production always builds. A preview is skipped only when every file changed since the
 * branch's last successful deployment is one the app's build never reads (tests, docs, CI, agent
 * config), so pull requests that cannot change the app spend no build minutes.
 *
 * Anything uncertain builds: no previous deployment on the branch, a previous commit outside the
 * shallow clone, a git error, a redeploy of the same commit. Dependabot's pull requests change
 * package.json and the lockfile, so they always build and their `Vercel` status still gates the
 * auto-merge policy (.github/scripts/dependabot-auto-merge.mjs).
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** Paths the Next.js build never reads. Everything else, including `party/` (the sandbox hosts the room), builds. */
export const APP_IRRELEVANT_PATHS = [
  /^e2e\//,
  /^test\//,
  /^docs\//,
  /^\.github\//,
  /^\.claude\//,
  /\.test\.(ts|tsx|mjs)$/,
  /^[^/]+\.md$/,
  /^(playwright|vitest)\.config\.ts$/,
];

const isAppIrrelevant = (file) => APP_IRRELEVANT_PATHS.some((pattern) => pattern.test(file));

/**
 * True when the deployment must build. `changedFiles` is null when the change set is unknown.
 * @param {{ env: Record<string, string | undefined>, changedFiles: string[] | null }} input
 */
export function shouldBuild({ env, changedFiles }) {
  if (env.VERCEL_ENV !== 'preview') return true;
  if (!changedFiles || changedFiles.length === 0) return true;
  return !changedFiles.every(isAppIrrelevant);
}

/** Files changed between the branch's last successful deployment and this commit, or null when unknown. */
export function changedSincePreviousDeployment(env, git = (args) => execFileSync('git', args, { encoding: 'utf8' })) {
  const previous = env.VERCEL_GIT_PREVIOUS_SHA;
  const current = env.VERCEL_GIT_COMMIT_SHA ?? 'HEAD';
  if (!previous) return null;
  try {
    return git(['diff', '--name-only', previous, current]).split('\n').map((line) => line.trim()).filter(Boolean);
  } catch {
    return null;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const changedFiles = changedSincePreviousDeployment(process.env);
  const build = shouldBuild({ env: process.env, changedFiles });
  process.stdout.write(build
    ? `Building: ${changedFiles ? `${changedFiles.length} changed file(s), not all outside the app` : 'change set unknown or production'}.\n`
    : `Skipping the preview: all ${changedFiles.length} changed file(s) are tests, docs or CI.\n`);
  process.exit(build ? 1 : 0);
}
