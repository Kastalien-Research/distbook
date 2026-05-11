// evals/src/test/f7-imprecise-citations.test.mts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runF7 } from '../checks/f7-imprecise-citations.mts';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

describe('F7 imprecise citations', () => {
  it('suggests full path for bare diff-stats.tsx', async () => {
    const findings = await runF7({
      repoPath: REPO,
      doc: 'fake.md',
      source: '# Doc\n\nSee `diff-stats.tsx` for the diff renderer.',
    });
    const blocker = findings.find((f) => f.status === 'blocker');
    expect(blocker).toBeDefined();
    expect(blocker!.suggestedFix).toContain('packages/web/src/components/apps/diff-stats.tsx');
  });

  it('does not flag full repo paths', async () => {
    const findings = await runF7({
      repoPath: REPO,
      doc: 'fake.md',
      source: '# Doc\n\nSee `packages/web/src/components/apps/diff-stats.tsx`.',
    });
    expect(findings).toHaveLength(0);
  });
});
