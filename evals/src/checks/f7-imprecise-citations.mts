// evals/src/checks/f7-imprecise-citations.mts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { extractBareFilenames, extractCitedPaths } from '../docs-parser.mts';

const exec = promisify(execFile);

export type Finding = {
  id: string;
  check: 'F7';
  doc: string;
  cited: string;
  status: 'pass' | 'blocker';
  suggestedFix?: string;
  detail: string;
};

export type RunF7Input = {
  repoPath: string;
  doc: string;
  source: string;
};

async function findFile(repo: string, name: string): Promise<string[]> {
  try {
    const { stdout } = await exec('git', ['ls-files', `*/${name}`, name], { cwd: repo });
    return stdout.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export async function runF7(input: RunF7Input): Promise<Finding[]> {
  const fullPaths = new Set(extractCitedPaths(input.source));
  const bareNames = extractBareFilenames(input.source).filter((n) => {
    // Exclude any bare name that's also part of a full path citation.
    for (const full of fullPaths) if (full.endsWith('/' + n)) return false;
    return true;
  });

  const findings: Finding[] = [];
  for (const bare of bareNames) {
    const hits = await findFile(input.repoPath, bare);
    if (hits.length === 1) {
      findings.push({
        id: `F7-${input.doc}-${bare}`,
        check: 'F7',
        doc: input.doc,
        cited: bare,
        status: 'blocker',
        suggestedFix: hits[0]!,
        detail: `Bare citation '${bare}'; full path: ${hits[0]!}`,
      });
    }
    // hits.length === 0 → not in repo; out of scope for F7 (would be ambient noise).
    // hits.length > 1  → ambiguous; out of scope for v0.
  }
  return findings;
}
