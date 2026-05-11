// evals/src/test/setup.test.mts
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

describe('eval-harness setup', () => {
  it('docs/discovery/ exists at the worktree root (run evals/scripts/link-docs.sh if missing)', () => {
    const docsDir = resolve(REPO, 'docs', 'discovery');
    if (!existsSync(docsDir)) {
      throw new Error(
        `docs/discovery/ not found at ${docsDir}.\n` +
          `docs/ is gitignored at the parent repo level. Run:\n` +
          `  bash evals/scripts/link-docs.sh\n` +
          `from the worktree root to symlink the parent's docs/ into the worktree.`,
      );
    }
    expect(existsSync(docsDir)).toBe(true);
  });

  it('docs/spec/ exists at the worktree root', () => {
    const specDir = resolve(REPO, 'docs', 'spec');
    expect(existsSync(specDir)).toBe(true);
  });
});
