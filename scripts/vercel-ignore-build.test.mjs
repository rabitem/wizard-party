import { describe, expect, it } from 'vitest';
import { changedSincePreviousDeployment, shouldBuild } from './vercel-ignore-build.mjs';

const preview = { VERCEL_ENV: 'preview' };

describe('Vercel ignored build step', () => {
  it.each([
    ['tests next to the source', ['shared/domain/game.test.ts', 'src/lib/redis.test.ts']],
    ['browser suites and level-4 suites', ['e2e/scenarios.spec.ts', 'test/integration/lobby.integration.test.ts']],
    ['docs, CI and agent config', ['docs/testing/testing.md', '.github/workflows/ci.yml', '.claude/skills/x/SKILL.md', 'README.md']],
    ['test runner config', ['playwright.config.ts', 'vitest.config.ts']],
  ])('skips a preview that only changes %s', (_label, changedFiles) => {
    expect(shouldBuild({ env: preview, changedFiles })).toBe(false);
  });

  it.each([
    ['app code', ['src/app/page.tsx']],
    ['shared domain code', ['shared/domain/entities/game.ts']],
    ['the worker, which the sandbox route hosts', ['party/room/game-room.ts']],
    ['dependencies (every Dependabot pull request)', ['package.json', 'package-lock.json']],
    ['a markdown file inside the app', ['src/app/docs/page.md']],
    ['tests together with one app file', ['src/lib/redis.test.ts', 'src/lib/redis.ts']],
  ])('builds a preview that changes %s', (_label, changedFiles) => {
    expect(shouldBuild({ env: preview, changedFiles })).toBe(true);
  });

  it('always builds production, whatever changed', () => {
    expect(shouldBuild({ env: { VERCEL_ENV: 'production' }, changedFiles: ['docs/testing/testing.md'] })).toBe(true);
  });

  it.each([
    ['an unknown change set', null],
    ['a redeploy of the same commit', []],
  ])('builds a preview with %s', (_label, changedFiles) => {
    expect(shouldBuild({ env: preview, changedFiles })).toBe(true);
  });

  it('diffs against the last successful deployment of the branch', () => {
    const calls = [];
    const files = changedSincePreviousDeployment(
      { VERCEL_GIT_PREVIOUS_SHA: 'prev', VERCEL_GIT_COMMIT_SHA: 'next' },
      (args) => { calls.push(args); return 'docs/a.md\n\ne2e/b.spec.ts\n'; },
    );
    expect(files).toEqual(['docs/a.md', 'e2e/b.spec.ts']);
    expect(calls).toEqual([['diff', '--name-only', 'prev', 'next']]);
  });

  it('reports the change set as unknown without a previous deployment or when git fails', () => {
    expect(changedSincePreviousDeployment({}, () => 'docs/a.md')).toBeNull();
    expect(changedSincePreviousDeployment({ VERCEL_GIT_PREVIOUS_SHA: 'gone' }, () => { throw new Error('bad object gone'); })).toBeNull();
  });
});
