// evals/src/test/d6-doc-references.test.mts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runD6 } from '../checks/d6-doc-references.mts';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

describe('D6 doc references', () => {
  it('passes when anchored heading exists', async () => {
    const findings = await runD6({
      repoPath: REPO,
      doc: 'fake.md',
      source: '# Doc\n\nSee [section](docs/spec/notebook-skills-runtime-v0.md#1-thesis).',
    });
    expect(findings.every((f) => f.status === 'pass')).toBe(true);
  });

  it('blocks when anchor does not match any heading', async () => {
    const findings = await runD6({
      repoPath: REPO,
      doc: 'fake.md',
      source: '# Doc\n\nSee [section](docs/spec/notebook-skills-runtime-v0.md#no-such-heading).',
    });
    expect(findings.some((f) => f.status === 'blocker')).toBe(true);
  });
});
