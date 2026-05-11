// evals/src/runner.mts
import { readFile, mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { ScorecardSchema, type Scorecard } from './scorecard.mts';

const exec = promisify(execFile);

export type RunNotebookInput = {
  notebookPath: string;
  env?: Record<string, string>;
};

export type RunNotebookResult = {
  workDir: string;
  cellOutputs: Array<{ filename: string; stdout: string; stderr: string }>;
  scorecardJson: Scorecard;
};

type Cell = { filename: string; lang: string; source: string };

function extractCells(src: string): Cell[] {
  const cellRe = /^###### (.+?)\n+```(\w+)\n([\s\S]*?)\n```/gm;
  const cells: Cell[] = [];
  let m: RegExpExecArray | null;
  while ((m = cellRe.exec(src))) {
    cells.push({ filename: m[1]!, lang: m[2]!, source: m[3]! });
  }
  return cells;
}

export async function runNotebook(input: RunNotebookInput): Promise<RunNotebookResult> {
  const src = await readFile(input.notebookPath, 'utf8');
  const cells = extractCells(src);
  const work = await mkdtemp(join(tmpdir(), `eval-${basename(input.notebookPath)}-`));
  await mkdir(join(work, 'src'), { recursive: true });

  for (const c of cells) {
    if (c.filename === 'package.json') {
      await writeFile(join(work, c.filename), c.source, 'utf8');
    } else {
      await writeFile(join(work, 'src', c.filename), c.source, 'utf8');
    }
  }

  const codeCells = cells.filter((c) => c.lang === 'typescript');
  const outputs: RunNotebookResult['cellOutputs'] = [];
  let scorecardJson: Scorecard | null = null;
  const env = input.env ? { ...process.env, ...input.env } : { ...process.env };

  for (const c of codeCells) {
    const cellPath = join(work, 'src', c.filename);
    try {
      const { stdout, stderr } = await exec(
        'node',
        ['--experimental-strip-types', '--no-warnings', cellPath],
        { env, maxBuffer: 50 * 1024 * 1024 },
      );
      outputs.push({ filename: c.filename, stdout, stderr });
      if (c.filename.startsWith('90-')) {
        scorecardJson = ScorecardSchema.parse(JSON.parse(stdout));
      }
    } catch (e: any) {
      outputs.push({
        filename: c.filename,
        stdout: e.stdout ?? '',
        stderr: e.stderr ?? String(e),
      });
      throw new Error(`cell ${c.filename} failed: ${e.stderr ?? e.message}`);
    }
  }

  if (scorecardJson === null) {
    throw new Error(
      'No 90-scorecard cell output found; notebook must end with a 90-* cell that prints scorecard JSON.',
    );
  }

  return { workDir: work, cellOutputs: outputs, scorecardJson };
}
