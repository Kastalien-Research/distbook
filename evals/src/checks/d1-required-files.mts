// evals/src/checks/d1-required-files.mts
import { access } from 'node:fs/promises';
import { join } from 'node:path';

export type Finding = {
  id: string;
  check: 'D1';
  doc: string;
  status: 'pass' | 'blocker';
  detail: string;
};

export type RunD1Input = {
  repoPath: string;
  required: string[];
};

export async function runD1(input: RunD1Input): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const rel of input.required) {
    const full = join(input.repoPath, rel);
    let ok = true;
    try {
      await access(full);
    } catch {
      ok = false;
    }
    findings.push({
      id: `D1-${rel}`,
      check: 'D1',
      doc: rel,
      status: ok ? 'pass' : 'blocker',
      detail: ok ? 'present' : `required file missing: ${rel}`,
    });
  }
  return findings;
}
