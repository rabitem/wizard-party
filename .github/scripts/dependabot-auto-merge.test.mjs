import { describe, expect, it, vi } from 'vitest';
import autoMerge, { getCheckState, hasBlockingReview, isUnchangedDependabotPR } from './dependabot-auto-merge.mjs';

const head = 'verified-dependency-commit';
const base = 'tested-main-commit';
const runId = 123;
const repository = 'rabitem/wizard-party';
const pr = {
  number: 51, state: 'open', draft: false, merged: false,
  user: { login: 'dependabot[bot]' },
  head: { sha: head, repo: { full_name: repository } },
  base: { ref: 'main', sha: base },
  mergeable: true, mergeable_state: 'clean',
};
const checks = [
  { name: 'Verify application', app: { slug: 'github-actions' }, status: 'completed', conclusion: 'success' },
  { name: 'GitGuardian Security Checks', app: { slug: 'gitguardian' }, status: 'completed', conclusion: 'success' },
];
const statuses = [{ context: 'Vercel', state: 'success' }];

describe('Dependabot check gate', () => {
  it('requires successful CI, GitGuardian, and Vercel even without branch protection', () => {
    expect(getCheckState(checks, statuses, runId)).toBe('ready');
    expect(getCheckState([], statuses, runId)).toBe('pending');
    expect(getCheckState(checks, [], runId)).toBe('pending');
    expect(getCheckState(checks.slice(0, 1), statuses, runId)).toBe('pending');
  });

  it.each(['skipped', 'neutral'])('does not accept a required CI conclusion of %s', (conclusion) => {
    expect(getCheckState([{ ...checks[0], conclusion }, checks[1]], statuses, runId)).toBe('pending');
  });

  it('does not trust a same-named CI check from a different app', () => {
    expect(getCheckState([{ ...checks[0], app: { slug: 'other-app' } }, checks[1]], statuses, runId)).toBe('pending');
  });

  it.each(['failure', 'cancelled', 'timed_out', 'action_required', 'stale', null])('blocks a check with conclusion %s', (conclusion) => {
    expect(getCheckState([...checks, { status: 'completed', conclusion }], statuses, runId)).toBe('failed');
  });

  it('waits for other checks and ignores only its own running job', () => {
    const other = { name: 'Other check', status: 'in_progress' };
    expect(getCheckState([...checks, other], statuses, runId)).toBe('pending');
    const own = { ...other, details_url: `https://github.com/${repository}/actions/runs/${runId}/job/456` };
    expect(getCheckState([...checks, own], statuses, runId)).toBe('ready');
  });

  it('uses the newest status rather than an earlier failure or earlier success', () => {
    expect(getCheckState(checks, [...statuses, { context: 'Vercel', state: 'failure' }], runId)).toBe('ready');
    expect(getCheckState(checks, [{ context: 'Vercel', state: 'pending' }, ...statuses], runId)).toBe('pending');
    expect(getCheckState(checks, [{ context: 'Vercel', state: 'error' }], runId)).toBe('failed');
  });
});

describe('Dependabot PR identity and reviews', () => {
  it('accepts only the same bot PR, repository, target branch, head, and base', () => {
    expect(isUnchangedDependabotPR(pr, pr, repository, 'main')).toBe(true);
    for (const changed of [
      { ...pr, state: 'closed' }, { ...pr, draft: true }, { ...pr, merged: true },
      { ...pr, user: { login: 'human' } },
      { ...pr, head: { ...pr.head, sha: 'untested-commit' } },
      { ...pr, head: { ...pr.head, repo: { full_name: 'fork/wizard-party' } } },
      { ...pr, base: { ...pr.base, sha: 'new-main' } },
      { ...pr, base: { ...pr.base, ref: 'other-branch' } },
    ]) expect(isUnchangedDependabotPR(changed, pr, repository, 'main')).toBe(false);
  });

  it('honors change requests until the reviewer approves or dismisses them', () => {
    const blocked = { user: { id: 1 }, state: 'CHANGES_REQUESTED' };
    expect(hasBlockingReview([blocked, { ...blocked, state: 'COMMENTED' }])).toBe(true);
    expect(hasBlockingReview([blocked, { ...blocked, state: 'APPROVED' }])).toBe(false);
    expect(hasBlockingReview([blocked, { ...blocked, state: 'DISMISSED' }])).toBe(false);
  });
});

function scenario({ updateType = 'version-update:semver-minor', states = [pr, pr], files, checkRuns = checks, reviews = [] } = {}) {
  let reads = 0;
  const github = {
    rest: {
      pulls: {
        get: vi.fn(async () => ({ data: states[Math.min(reads++, states.length - 1)] })),
        merge: vi.fn(async () => ({ data: { merged: true } })),
        listFiles: 'files', listReviews: 'reviews',
      },
      checks: { listForRef: 'checks' },
      repos: { listCommitStatusesForRef: 'statuses' },
    },
    paginate: vi.fn(async (endpoint) => ({
      files: files ?? [{ filename: 'package-lock.json', status: 'modified' }],
      checks: checkRuns, statuses, reviews,
    })[endpoint]),
  };
  return {
    github, updateType, context: {
      repo: { owner: 'rabitem', repo: 'wizard-party' }, runId,
      payload: { pull_request: pr, repository: { default_branch: 'main' } },
    }, core: { info: vi.fn() }, wait: vi.fn(),
  };
}

describe('Dependabot merge operation', () => {
  it.each(['version-update:semver-minor', 'version-update:semver-patch'])('merges %s using the checked head SHA', async (updateType) => {
    const test = scenario({ updateType });
    await autoMerge(test);
    expect(test.github.rest.pulls.merge).toHaveBeenCalledWith({
      owner: 'rabitem', repo: 'wizard-party', pull_number: 51, sha: head, merge_method: 'squash',
    });
  });

  it.each(['version-update:semver-major', '', undefined])('leaves major and unclassified updates manual (%s)', async (updateType) => {
    const test = { ...scenario(), updateType };
    await autoMerge(test);
    expect(test.github.rest.pulls.merge).not.toHaveBeenCalled();
  });

  it('rejects dependency PRs that also change application or workflow code', async () => {
    const test = scenario({ files: [{ filename: '.github/workflows/ci.yml', status: 'modified' }] });
    await expect(autoMerge(test)).rejects.toThrow('Only npm');
    expect(test.github.rest.pulls.merge).not.toHaveBeenCalled();
  });

  it('leaves missing checks unmerged when the deadline expires', async () => {
    const test = scenario({ checkRuns: [] });
    await expect(autoMerge(test)).rejects.toThrow('deadline');
    expect(test.github.rest.pulls.merge).not.toHaveBeenCalled();
  });

  it('does not merge a commit pushed after checks completed', async () => {
    const test = scenario({ states: [pr, { ...pr, head: { ...pr.head, sha: 'replacement-commit' } }] });
    await autoMerge(test);
    expect(test.github.rest.pulls.merge).not.toHaveBeenCalled();
  });

  it('does not merge against a base that changed after CI started', async () => {
    const test = scenario({ states: [{ ...pr, base: { ...pr.base, sha: 'changed-main' } }] });
    await autoMerge(test);
    expect(test.github.rest.pulls.merge).not.toHaveBeenCalled();
  });

  it('leaves changes requested by a human unmerged', async () => {
    const test = scenario({ reviews: [{ user: { id: 1 }, state: 'CHANGES_REQUESTED' }] });
    await expect(autoMerge(test)).rejects.toThrow('reviewer requested changes');
    expect(test.github.rest.pulls.merge).not.toHaveBeenCalled();
  });
});
