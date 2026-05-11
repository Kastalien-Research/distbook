// evals/src/test/d1-required-files.test.mts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runD1 } from '../checks/d1-required-files.mts';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

describe('D1 required-files', () => {
  it('all real discovery files pass', async () => {
    const findings = await runD1({
      repoPath: REPO,
      required: ['docs/discovery/00-repo-map.md', 'docs/discovery/02-app-builder-archaeology.md'],
    });
    expect(findings.every((f) => f.status === 'pass')).toBe(true);
  });

  it('missing file is a blocker', async () => {
    const findings = await runD1({
      repoPath: REPO,
      required: ['docs/discovery/does-not-exist.md'],
    });
    expect(findings[0]!.status).toBe('blocker');
  });
});
