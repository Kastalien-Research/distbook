// evals/src/test/runner.test.mts
import { describe, it, expect } from 'vitest';
import { join, resolve } from 'node:path';
import { runNotebook } from '../runner.mts';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');

describe('runner', () => {
  it('executes the prototype notebook and returns scorecard JSON from the last cell', async () => {
    const result = await runNotebook({
      notebookPath: join(ROOT, 'evals/notebooks/prototype.src.md'),
      env: { REPO_PATH: ROOT },
    });
    expect(result.scorecardJson.summary.blocker).toBe(1);
    expect(result.scorecardJson.findings[0].id).toBe('D2-app-builder-removal-claim');
  });
});
