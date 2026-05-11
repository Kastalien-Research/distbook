// evals/src/test/semantic-router.test.mts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { routeClaims } from '../semantic/router.mts';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

describe('semantic router', () => {
  it('routes a commit-exists claim to D2', async () => {
    const findings = await routeClaims({
      repoPath: REPO,
      doc: 'fake.md',
      claims: [
        {
          kind: 'commit-exists',
          sha: 'c7a52cc',
          assertion: 'absent',
          sourceLine: 1,
          sourceText: 'X',
        },
      ],
    });
    expect(findings.some((f) => f.check === 'D2' && f.status === 'blocker')).toBe(true);
  });

  it('routes a path-exists claim to D4', async () => {
    const findings = await routeClaims({
      repoPath: REPO,
      doc: 'fake.md',
      claims: [
        {
          kind: 'path-exists',
          path: 'packages/api/srcmd/decoding.mts',
          assertion: 'present',
          sourceLine: 1,
          sourceText: 'X',
        },
      ],
    });
    expect(findings.some((f) => f.check === 'D4' && f.status === 'pass')).toBe(true);
  });
});
