// evals/src/test/prototype.test.mts
import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const exec = promisify(execFile);
const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');

async function extractCells(
  srcMdPath: string,
): Promise<Array<{ filename: string; source: string }>> {
  const src = await readFile(srcMdPath, 'utf8');
  const cellRe = /^###### (.+?)\n+```(?:typescript|json)\n([\s\S]*?)\n```/gm;
  const cells: Array<{ filename: string; source: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = cellRe.exec(src))) {
    cells.push({ filename: m[1]!, source: m[2]! });
  }
  return cells;
}

describe('prototype notebook integration', () => {
  it('extracts cells in declared order', async () => {
    const cells = await extractCells(join(REPO_ROOT, 'evals/notebooks/prototype.src.md'));
    expect(cells.map((c) => c.filename)).toEqual([
      'package.json',
      '00-config.ts',
      '10-d2-git-claims.ts',
      '90-scorecard.ts',
    ]);
  });

  it('writes cells to tmpdir and executes scorecard, catching c7a52cc claim', async () => {
    const cells = await extractCells(join(REPO_ROOT, 'evals/notebooks/prototype.src.md'));
    const work = await mkdtemp(join(tmpdir(), 'eval-proto-'));
    await mkdir(join(work, 'src'), { recursive: true });
    for (const c of cells) {
      if (c.filename === 'package.json') {
        await writeFile(join(work, c.filename), c.source);
      } else {
        await writeFile(join(work, 'src', c.filename), c.source);
      }
    }
    const { stdout } = await exec(
      'node',
      ['--experimental-strip-types', '--no-warnings', join(work, 'src', '90-scorecard.ts')],
      { env: { ...process.env, REPO_PATH: REPO_ROOT } },
    );
    const result = JSON.parse(stdout);
    expect(result.summary.blocker).toBe(1);
    expect(result.findings[0].id).toBe('D2-app-builder-removal-claim');
    expect(result.findings[0].detail).toContain('c7a52cc');
  });
});
