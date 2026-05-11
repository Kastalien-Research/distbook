// evals/src/test/d2-git-claims.test.mts
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { runD2 } from '../checks/d2-git-claims.mts';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

describe('D2 git-claim check', () => {
  it('flags the c7a52cc absence claim as blocker', async () => {
    const src = await readFile(
      join(import.meta.dirname, 'fixtures', 'docs-with-false-claim.md'),
      'utf8',
    );
    const findings = await runD2({
      repoPath: REPO,
      doc: 'docs-with-false-claim.md',
      source: src,
    });
    const blockers = findings.filter((f) => f.status === 'blocker');
    expect(blockers.length).toBeGreaterThan(0);
    expect(blockers[0]!.detail).toContain('c7a52cc');
  });

  it('passes when there are no negative commit claims', async () => {
    const findings = await runD2({
      repoPath: REPO,
      doc: 'empty.md',
      source: '# Title\n\nNo commit claims here.\n',
    });
    expect(findings.filter((f) => f.status === 'blocker')).toHaveLength(0);
  });
});
