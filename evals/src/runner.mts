// evals/src/runner.mts
import { readFile, mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { decode } from '@srcbook/api/srcmd/decoding.mjs';
import type { DecodeSuccessResult } from '@srcbook/api/srcmd/types.mjs';
import { ScorecardSchema, type Scorecard } from './scorecard.mts';

// Narrow the cell union to the code-cell variant using the decoded srcbook type.
type DecodedCell = DecodeSuccessResult['srcbook']['cells'][number];
type CodeCell = Extract<DecodedCell, { type: 'code' }>;

const exec = promisify(execFile);

export type RunNotebookInput = {
  notebookPath: string;
  env?: Record<string, string>;
  timeoutMs?: number;
};

export type RunNotebookResult = {
  workDir: string;
  cellOutputs: Array<{ filename: string; stdout: string; stderr: string }>;
  scorecardJson: Scorecard;
};

export async function runNotebook(input: RunNotebookInput): Promise<RunNotebookResult> {
  const src = await readFile(input.notebookPath, 'utf8');
  const result = decode(src);
  if (result.error) {
    throw new Error(`Failed to decode notebook: ${result.errors.join('; ')}`);
  }

  const cells = result.srcbook.cells;
  const timeoutMs = input.timeoutMs ?? 60_000;
  const work = await mkdtemp(join(tmpdir(), `eval-${basename(input.notebookPath)}-`));
  await mkdir(join(work, 'src'), { recursive: true });

  let hasPackageJson = false;

  for (const cell of cells) {
    if (cell.type === 'package.json') {
      await writeFile(join(work, 'package.json'), cell.source, 'utf8');
      hasPackageJson = true;
    } else if (cell.type === 'code') {
      await writeFile(join(work, 'src', cell.filename), cell.source, 'utf8');
    }
    // Skip title, markdown, and placeholder cells — no I/O needed.
  }

  // Run npm install if package.json has non-empty dependencies.
  if (hasPackageJson) {
    const pkgRaw = await readFile(join(work, 'package.json'), 'utf8');
    const pkg = JSON.parse(pkgRaw) as Record<string, unknown>;
    const deps = pkg['dependencies'];
    const hasNonEmptyDeps =
      deps !== null && typeof deps === 'object' && Object.keys(deps).length > 0;

    if (hasNonEmptyDeps) {
      // Install can be slow; give it at least 2 minutes regardless of per-cell timeoutMs.
      const installTimeout = Math.max(timeoutMs, 120_000);
      try {
        await exec('npm', ['install', '--no-audit', '--no-fund', '--prefer-offline', '--silent'], {
          cwd: work,
          timeout: installTimeout,
          maxBuffer: 10 * 1024 * 1024,
        });
      } catch (e: unknown) {
        const err = e as { stderr?: string; message?: string };
        throw new Error(`npm install failed: ${err.stderr ?? err.message ?? String(e)}`);
      }
    }
  }

  const codeCells = cells.filter(
    (cell): cell is CodeCell => cell.type === 'code' && cell.language === 'typescript',
  );

  const outputs: RunNotebookResult['cellOutputs'] = [];
  let scorecardJson: Scorecard | null = null;
  const env = input.env ? { ...process.env, ...input.env } : { ...process.env };

  for (const cell of codeCells) {
    const cellPath = join(work, 'src', cell.filename);
    try {
      const { stdout, stderr } = await exec(
        'node',
        ['--experimental-strip-types', '--no-warnings', cellPath],
        { env, timeout: timeoutMs, maxBuffer: 50 * 1024 * 1024 },
      );
      outputs.push({ filename: cell.filename, stdout, stderr });
      if (cell.filename.startsWith('90-')) {
        scorecardJson = ScorecardSchema.parse(JSON.parse(stdout));
      }
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
      const reason =
        err.killed === true
          ? `timed out after ${timeoutMs}ms`
          : (err.stderr ?? err.message ?? String(e));
      outputs.push({
        filename: cell.filename,
        stdout: err.stdout ?? '',
        stderr: err.stderr ?? String(e),
      });
      throw new Error(`cell ${cell.filename} failed: ${reason}`);
    }
  }

  if (scorecardJson === null) {
    throw new Error(
      'No 90-scorecard cell output found; notebook must end with a 90-* cell that prints scorecard JSON.',
    );
  }

  return { workDir: work, cellOutputs: outputs, scorecardJson };
}
