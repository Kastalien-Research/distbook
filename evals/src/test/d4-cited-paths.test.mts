// evals/src/test/d4-cited-paths.test.mts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runD4 } from '../checks/d4-cited-paths.mts';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

describe('D4 cited-paths', () => {
  it('passes for real paths at HEAD', async () => {
    const findings = await runD4({
      repoPath: REPO,
      ref: 'HEAD',
      doc: 'fake.md',
      source: '# Doc\n\nSee `packages/api/srcmd/decoding.mts` for parsing.',
    });
    expect(findings.every((f) => f.status === 'pass')).toBe(true);
  });

  it('blocks for missing path at HEAD', async () => {
    const findings = await runD4({
      repoPath: REPO,
      ref: 'HEAD',
      doc: 'fake.md',
      source: '# Doc\n\nSee `packages/api/notebook-skills/manifest.mts`.',
    });
    expect(findings.some((f) => f.status === 'blocker')).toBe(true);
  });

  it('emits blocker with section context for proposal paths (no allowlist)', async () => {
    const findings = await runD4({
      repoPath: REPO,
      ref: 'HEAD',
      doc: 'docs/spec/notebook-skills-runtime-v0.md',
      source:
        '# Spec\n\n## Effect-TS architecture proposal\n\nSee `packages/api/notebook-skills/manifest.mts`.',
    });
    expect(findings.some((f) => f.status === 'blocker')).toBe(true);
    const blocker = findings.find((f) => f.status === 'blocker');
    expect(blocker?.section).toBe('Effect-TS architecture proposal');
  });
});
