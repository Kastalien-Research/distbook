// evals/src/test/setup.test.mts
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadConfig } from '../config.mts';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

describe('eval-harness setup', () => {
  it('all directories named in config.required_files exist (run evals/scripts/link-docs.sh if missing)', async () => {
    const cfg = await loadConfig(resolve(REPO, 'evals/config.yaml'));
    const dirs = new Set<string>();
    for (const path of [...cfg.required_files.discovery, ...cfg.required_files.spec]) {
      dirs.add(dirname(path));
    }
    expect(dirs.size).toBeGreaterThan(0);
    const missing: string[] = [];
    for (const dir of dirs) {
      const full = resolve(REPO, dir);
      if (!existsSync(full)) missing.push(dir);
    }
    if (missing.length > 0) {
      throw new Error(
        `Missing required directories: ${missing.join(', ')}.\n` +
          `docs/ is gitignored at the parent repo level. Run:\n` +
          `  bash evals/scripts/link-docs.sh\n` +
          `from the worktree root to symlink the parent's docs/ into the worktree.`,
      );
    }
  });
});
