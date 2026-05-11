// evals/src/checks/d4-cited-paths.mts
import { pathExistsAtRef } from '../repo-truth.mts';
import { extractCitedPaths, parseSections } from '../docs-parser.mts';

export type Finding = {
  id: string;
  check: 'D4';
  doc: string;
  cited: string;
  ref: string;
  section?: string;
  status: 'pass' | 'blocker';
  detail: string;
};

export type RunD4Input = {
  repoPath: string;
  ref: string;
  doc: string;
  source: string;
};

function sectionFor(line: number, sections: ReturnType<typeof parseSections>): string | undefined {
  let current: string | undefined;
  for (const s of sections) {
    if (s.startLine <= line) current = s.heading ?? undefined;
    else break;
  }
  return current;
}

export async function runD4(input: RunD4Input): Promise<Finding[]> {
  const { repoPath, ref, doc, source } = input;
  const sections = parseSections(source);
  const paths = extractCitedPaths(source);
  const findings: Finding[] = [];

  // Find each path's first occurrence line for section context.
  const lines = source.split('\n');
  const lineOf: Record<string, number> = {};
  for (const p of paths) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]!.includes(`\`${p}\``)) {
        lineOf[p] = i + 1;
        break;
      }
    }
  }

  for (const p of paths) {
    const exists = await pathExistsAtRef(repoPath, ref, p);
    const section = sectionFor(lineOf[p] ?? 1, sections);
    findings.push({
      id: `D4-${doc}-${p}`,
      check: 'D4',
      doc,
      cited: p,
      ref,
      ...(section !== undefined && { section }),
      status: exists ? 'pass' : 'blocker',
      detail: exists ? `${p} exists at ${ref}` : `cited path missing at ${ref}: ${p}`,
    });
  }
  return findings;
}
