// evals/src/checks/d6-doc-references.mts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type Finding = {
  id: string;
  check: 'D6';
  doc: string;
  link: string;
  status: 'pass' | 'blocker';
  detail: string;
};

export type RunD6Input = {
  repoPath: string;
  doc: string;
  source: string;
};

function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export async function runD6(input: RunD6Input): Promise<Finding[]> {
  const linkRe = /\]\(([^)]*\.md)(#([^)]+))?\)/g;
  const findings: Finding[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(input.source))) {
    const targetDoc = m[1]!;
    const anchor = m[3];
    if (!anchor) continue;
    const targetPath = join(input.repoPath, targetDoc);
    let targetSrc: string;
    try {
      targetSrc = await readFile(targetPath, 'utf8');
    } catch {
      findings.push({
        id: `D6-${input.doc}-${targetDoc}-${anchor}`,
        check: 'D6',
        doc: input.doc,
        link: `${targetDoc}#${anchor}`,
        status: 'blocker',
        detail: `target doc unreadable: ${targetDoc}`,
      });
      continue;
    }
    const headings = targetSrc
      .split('\n')
      .filter((line) => line.match(/^#+\s/))
      .map((line) => slugify(line.replace(/^#+\s+/, '')));
    const ok = headings.includes(anchor.toLowerCase());
    findings.push({
      id: `D6-${input.doc}-${targetDoc}-${anchor}`,
      check: 'D6',
      doc: input.doc,
      link: `${targetDoc}#${anchor}`,
      status: ok ? 'pass' : 'blocker',
      detail: ok ? 'anchor matches a heading' : `anchor "${anchor}" not found in ${targetDoc}`,
    });
  }
  return findings;
}
